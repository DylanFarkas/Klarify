/**
 * @fileoverview Adaptador real para OpenAI Audio (Transcriptor).
 *
 * Se conecta a la API de OpenAI para transcribir audio a texto.
 * Utiliza el formato `verbose_json` para obtener los segmentos con
 * timestamps, permitiendo cumplir con el CA2 (vista estructurada).
 */

import OpenAI from 'openai';
import { IASRAdapter } from './IASRAdapter';
import type { TranscriptionResult } from '@/lib/types/agent-1';

export class OpenAIASRAdapter implements IASRAdapter {
  private openai: OpenAI | null = null;

  constructor() {
    // Si la API key no está disponible (ej. build time o cliente), no falla en la instanciación
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  async transcribe(file: File): Promise<TranscriptionResult> {
    if (!this.openai) {
      throw new Error('OPENAI_API_KEY no está configurada en las variables de entorno.');
    }

    try {
      console.log(`[OpenAIASRAdapter] Iniciando transcripción de: ${file.name} (${file.size} bytes)`);

      // Enviar el archivo a la API pidiendo verbose_json para obtener segmentos y duración
      const response = await this.openai.audio.transcriptions.create({
        file: file,
        model: 'gpt-4o-mini-transcribe',
        response_format: 'verbose_json',
        // prompt: 'Contexto opcional aquí para mejorar precisión'
      });

      // Mapear la respuesta de OpenAI a nuestro formato estandarizado
      const mappedResult: TranscriptionResult = {
        fullText: response.text,
        language: response.language || 'es',
        duration: response.duration || 0,
        segments: (response.segments || []).map((seg: any) => ({
          start: seg.start,
          end: seg.end,
          text: seg.text,
          confidence: Math.exp(seg.avg_logprob || 0), // Aproximación de confianza (0 a 1) a partir de logprob
          // Nota: El modelo base no soporta diarización (speaker detection) directamente.
          // Para MVP, lo dejamos undefined o se podría deducir de los canales si fuera estéreo.
          speaker: undefined,
        })),
      };

      console.log(`[OpenAIASRAdapter] Transcripción exitosa. Segmentos: ${mappedResult.segments.length}`);
      return mappedResult;

    } catch (error) {
      console.error('[OpenAIASRAdapter] Error al transcribir:', error);
      throw new Error(`Error en el servicio de transcripción (OpenAI): ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
}
