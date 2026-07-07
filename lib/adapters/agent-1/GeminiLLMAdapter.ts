/**
 * @fileoverview Adaptador real para Google Gemini (LLM).
 *
 * Evalúa si el contexto del usuario es suficiente para un backlog y,
 * si no lo es, genera preguntas de clarificación con opciones MCQ.
 * Extrae deseos accionables a partir del contexto enriquecido.
 */

import { GoogleGenAI } from '@google/genai';
import { ILLMAdapter } from './ILLMAdapter';
import type {
  ClarifyingQuestion,
  ContextDiscovery,
  TranscriptionResult,
  Wish,
} from '@/lib/types/agent-1';
import {
  MAX_CLARIFY_QUESTIONS,
  MAX_OPTIONS_PER_QUESTION,
  MIN_OPTIONS_PER_QUESTION,
} from '@/lib/constants/agent-1';
import { generateWishId } from '@/lib/services/agent-1-service';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';
import type { AiGenerationConfig } from '@/lib/plans/types';
import { defaultAiConfig } from '@/lib/plans/ai-config';

interface RawAnalyzeResponse {
  isSufficient: boolean;
  summary: string;
  gaps: string[];
  questions: Array<{
    id: string;
    question: string;
    category: string;
    options: Array<{ id: string; label: string }>;
  }>;
}

interface ContentPart {
  text?: string;
  thought?: boolean;
}

export class GeminiLLMAdapter implements ILLMAdapter {
  private ai: GoogleGenAI | null = null;
  private modelName = 'gemini-2.5-flash';

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });
    }
  }

  async analyzeContext(
    transcription: TranscriptionResult,
    aiConfig?: AiGenerationConfig
  ): Promise<ContextDiscovery> {
    return this.analyzeContextStream(transcription, () => {}, aiConfig);
  }

  async analyzeContextStream(
    transcription: TranscriptionResult,
    onThought: LLMThoughtCallback,
    aiConfig?: AiGenerationConfig
  ): Promise<ContextDiscovery> {
    const config = aiConfig ?? defaultAiConfig();
    if (!this.ai) {
      throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno.');
    }

    try {
      console.log('[GeminiLLMAdapter] Evaluando contexto...');

      const systemInstruction = `Devuelve la respuesta estrictamente como un objeto JSON con esta forma exacta. No incluyas markdown ni texto extra.

{
  "isSufficient": boolean,
  "summary": "Resumen amigable en 2-3 oraciones de lo que entendiste del proyecto",
  "gaps": ["vacío 1", "vacío 2"],
  "questions": [
    {
      "id": "q-1",
      "question": "Pregunta clara y concreta",
      "category": "platform|users|scope|business|constraints",
      "options": [
        { "id": "opt-1", "label": "Opción corta y accionable" }
      ]
    }
  ]
}

REGLAS CRÍTICAS:
- Evalúa si hay contexto SUFICIENTE para generar un backlog útil (plataforma, usuarios, alcance funcional, modelo de negocio, restricciones).
- Si isSufficient es true: questions debe ser un array vacío y gaps puede estar vacío.
- Si isSufficient es false: genera entre 1 y ${MAX_CLARIFY_QUESTIONS} preguntas, SOLO las más críticas según los vacíos detectados.
- Cada pregunta debe tener entre ${MIN_OPTIONS_PER_QUESTION} y ${MAX_OPTIONS_PER_QUESTION} opciones concretas y realistas para el dominio detectado.
- NO incluyas opción "Otra opción" — la UI la añade automáticamente.
- Las preguntas deben ser en español, directas y fáciles de responder.
- IDs únicos: q-1, q-2... y opt-1, opt-2... por pregunta.`;

      const userPrompt = `Evalúa el siguiente contexto del proyecto del cliente y determina si es suficiente para crear un backlog de software.

CONTEXTO DEL CLIENTE:
"""
${transcription.fullText}
"""`;

      const responseText = await this.streamGenerate(
        userPrompt,
        systemInstruction,
        'application/json',
        0.3,
        onThought,
        config.thinkingBudget
      );

      if (!responseText) {
        throw new Error('Respuesta vacía de Gemini');
      }

      const raw: RawAnalyzeResponse = JSON.parse(responseText);
      const questions = this.normalizeQuestions(raw.questions ?? []);

      console.log(
        `[GeminiLLMAdapter] Evaluación completada. Suficiente: ${raw.isSufficient}, Preguntas: ${questions.length}`
      );

      return {
        isSufficient: Boolean(raw.isSufficient),
        summary: typeof raw.summary === 'string' ? raw.summary.trim() : '',
        gaps: Array.isArray(raw.gaps) ? raw.gaps.filter((g) => typeof g === 'string') : [],
        questions,
        answers: [],
        skipped: false,
      };
    } catch (error) {
      console.error('[GeminiLLMAdapter] Error al evaluar contexto:', error);
      throw new Error(
        `Error en el servicio de evaluación (Gemini): ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }
  }

  async extractWishes(
    transcription: TranscriptionResult,
    enrichedContext?: string | null,
    aiConfig?: AiGenerationConfig
  ): Promise<Wish[]> {
    return this.extractWishesStream(transcription, enrichedContext, () => {}, aiConfig);
  }

  async extractWishesStream(
    transcription: TranscriptionResult,
    enrichedContext: string | null | undefined,
    onThought: LLMThoughtCallback,
    aiConfig?: AiGenerationConfig
  ): Promise<Wish[]> {
    const config = aiConfig ?? defaultAiConfig();
    if (!this.ai) {
      throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno.');
    }

    try {
      console.log('[GeminiLLMAdapter] Iniciando extracción de deseos con Gemini...');

      const contextBlock = enrichedContext?.trim()
        ? `\nCONTEXTO ENRIQUECIDO (incluye respuestas del cliente):\n"""\n${enrichedContext}\n"""`
        : '';

      const prompt = `
Eres un analista de requerimientos experto (Product Owner/Scrum Master).
Analiza el contexto del cliente y extrae necesidades, deseos o funcionalidades como elementos accionables para crear Historias de Usuario.

REGLAS:
1. Descompón la idea en deseos concretos y accionables — NO parafrasees la entrada del usuario.
2. Cada deseo debe describir una funcionalidad, necesidad o restricción clara.
3. Si infieres algo no explícito, prefixa el deseo con "[SUPUESTO]".
4. NO inventes features que no estén sugeridas por el contexto.
5. Ignora saludos, despedidas o conversaciones triviales.
6. Genera entre 3 y 12 deseos según la riqueza del contexto.

TRANSCRIPCIÓN ORIGINAL:
"""
${transcription.fullText}
"""
${contextBlock}
      `;

      const responseText = await this.streamGenerate(
        prompt,
        'Devuelve la respuesta estrictamente como un array de strings en formato JSON (ej: ["deseo 1", "deseo 2"]). No incluyas markdown ni bloques de código extra, solo el array.',
        'application/json',
        0.2,
        onThought,
        config.thinkingBudget
      );

      if (!responseText) {
        throw new Error('Respuesta vacía de Gemini');
      }

      const rawWishes: string[] = JSON.parse(responseText);

      if (!Array.isArray(rawWishes)) {
        throw new Error('Gemini no devolvió un array JSON válido');
      }

      const wishes: Wish[] = [];
      for (const text of rawWishes) {
        if (typeof text === 'string' && text.trim().length > 0) {
          wishes.push({
            id: generateWishId(wishes),
            text: text.trim(),
            source: 'auto',
            isEdited: false,
            createdAt: Date.now(),
          });
        }
      }

      console.log(`[GeminiLLMAdapter] Extracción exitosa. Deseos encontrados: ${wishes.length}`);
      return wishes;
    } catch (error) {
      console.error('[GeminiLLMAdapter] Error al extraer deseos:', error);
      throw new Error(
        `Error en el servicio de extracción (Gemini): ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }
  }

  private async streamGenerate(
    contents: string,
    systemInstruction: string,
    responseMimeType: string,
    temperature: number,
    onThought: LLMThoughtCallback,
    thinkingBudget: number
  ): Promise<string> {
    if (!this.ai) {
      throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno.');
    }

    const responseStream = await this.ai.models.generateContentStream({
      model: this.modelName,
      contents,
      config: {
        systemInstruction,
        responseMimeType,
        temperature,
        thinkingConfig: {
          includeThoughts: true,
          thinkingBudget,
        },
      },
    });

    let outputText = '';

    for await (const chunk of responseStream) {
      const parts = (chunk.candidates?.[0]?.content?.parts ?? []) as ContentPart[];

      for (const part of parts) {
        if (typeof part.text !== 'string') continue;

        if (part.thought === true) {
          onThought(part.text);
        } else {
          outputText += part.text;
        }
      }
    }

    return outputText;
  }

  private normalizeQuestions(
    rawQuestions: RawAnalyzeResponse['questions']
  ): ClarifyingQuestion[] {
    const validCategories = new Set([
      'platform',
      'users',
      'scope',
      'business',
      'constraints',
    ]);

    return rawQuestions
      .slice(0, MAX_CLARIFY_QUESTIONS)
      .map((q, index) => ({
        id: q.id || `q-${index + 1}`,
        question: q.question?.trim() ?? '',
        category: validCategories.has(q.category)
          ? (q.category as ClarifyingQuestion['category'])
          : 'scope',
        options: (q.options ?? [])
          .slice(0, MAX_OPTIONS_PER_QUESTION)
          .map((opt, optIndex) => ({
            id: opt.id || `opt-${optIndex + 1}`,
            label: opt.label?.trim() ?? '',
          }))
          .filter((opt) => opt.label.length > 0),
      }))
      .filter((q) => q.question.length > 0 && q.options.length >= MIN_OPTIONS_PER_QUESTION);
  }
}
