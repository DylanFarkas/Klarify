/**
 * @fileoverview Adaptador real para Google Gemini (LLM).
 *
 * Utiliza el SDK @google/genai para analizar la transcripción de la reunión
 * y extraer una lista estructurada de las necesidades/deseos del cliente.
 * Se fuerza el formato de salida a JSON para facilitar el parseo.
 */

import { GoogleGenAI } from '@google/genai';
import { ILLMAdapter } from './ILLMAdapter';
import type { TranscriptionResult, Wish } from '@/lib/types/agent-1';
import { generateWishId } from '@/lib/services/agent-1-service';

export class GeminiLLMAdapter implements ILLMAdapter {
  private ai: GoogleGenAI | null = null;
  // Usamos un modelo rápido y barato para esta tarea
  private modelName = 'gemini-2.5-flash';

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });
    }
  }

  async extractWishes(transcription: TranscriptionResult): Promise<Wish[]> {
    if (!this.ai) {
      throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno.');
    }

    try {
      console.log('[GeminiLLMAdapter] Iniciando extracción de deseos con Gemini...');

      const prompt = `
Eres un analista de requerimientos experto (Product Owner/Scrum Master).
Analiza la siguiente transcripción de una reunión con un cliente y extrae sus necesidades, deseos o dolores.
Estos serán utilizados como insumo para crear Historias de Usuario más adelante.

REGLAS:
1. Extrae cada necesidad o deseo como un elemento separado.
2. Escribe cada deseo desde la perspectiva del cliente o describiendo la funcionalidad de forma clara y accionable.
3. Ignora saludos, despedidas o conversaciones triviales.

TRANSCRIPCIÓN:
"""
${transcription.fullText}
"""
      `;

      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          systemInstruction: 'Devuelve la respuesta estrictamente como un array de strings en formato JSON (ej: ["deseo 1", "deseo 2"]). No incluyas markdown ni bloques de código extra, solo el array.',
          responseMimeType: 'application/json',
          temperature: 0.2, // Baja temperatura para mayor determinismo y foco
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Respuesta vacía de Gemini');
      }

      // Parsear la respuesta JSON (array de strings)
      const rawWishes: string[] = JSON.parse(responseText);
      
      if (!Array.isArray(rawWishes)) {
        throw new Error('Gemini no devolvió un array JSON válido');
      }

      // Mapear al tipo Wish del dominio
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
      throw new Error(`Error en el servicio de extracción (Gemini): ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
}
