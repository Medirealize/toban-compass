import { SAMPLE_FACILITIES } from "./mock-data";
import type { ParsedScheduleResult } from "./types";

const MOCK_DELAY_MS = 1200;

/**
 * 当番表スクショ/PDFのAI解析をシミュレート。
 * 本番では OpenAI Structured Outputs 等に置き換え。
 */
export async function simulateScheduleParse(
  file: File
): Promise<ParsedScheduleResult> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

  return {
    facilities: SAMPLE_FACILITIES.map((f) => ({ ...f })),
    parsedAt: new Date().toISOString(),
    source: file.name,
  };
}
