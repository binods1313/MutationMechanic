
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { DISEASE_VARIANTS, MOCK_ANALYSIS } from '../constants';
import { PredictionData } from '../types';

export interface HistoryItem {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface VariantAnalysis {
  variant: {
    protein: string;
    hgvs: string;
    disease: string;
    id: string;
    uniprot: string;
    sequence: string;
    mutantSequence?: string; // New field
    mutationPositionInSnippet?: number; // New field for correct highlighting
  };
  mechanism: string;
  analysis: {
    summary: string;
    compensatory_mutations: Array<{
      mutation: string;
      reasoning: string;
      confidence: number;
    }>;
  };
  predictions: PredictionData;
  riskScore?: number;
  confidence?: number;
  proteinChange?: string;
  consequence?: string;
  pdbData?: {
    native: string;
    mutant?: string;
  };
}

export const generateVariantReport = async (gene: string, variant: string): Promise<VariantAnalysis> => {
  const query = `${gene} ${variant}`;
  
  // 1. Try Real API
  // Using process.env.API_KEY directly for initialization as per guidelines
  if (process.env.API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = "gemini-3-flash-preview";
      
      const prompt = `
        You are a molecular biologist specializing in genetic variant analysis.
        For the variant: ${gene} ${variant}

        Provide a detailed, structured JSON response with the following structure:
        {
          "variant": {
            "protein": "${gene}",
            "hgvs": "${variant}",
            "disease": "Known disease(s) or 'Uncertain Significance'",
            "id": "${gene}-${variant}",
            "uniprot": "UniProt ID if known",
            "sequence": "Representative 60-80 char wild-type sequence snippet centered on mutation",
            "mutantSequence": "The same snippet but with the specific amino acid change applied",
            "mutationPositionInSnippet": "1-based index of the mutated residue within the snippet"
          },
          "proteinChange": "Brief description of amino acid change",
          "consequence": "missense | nonsense | frameshift | splice_site | regulatory",
          "mechanism": "Detailed explanation of how this mutation disrupts protein function",
          "clinicalSignificance": "Brief clinical impact",
          "diseaseAssociation": "Known disease(s)",
          "analysis": {
             "summary": "Concise summary of structural impact.",
             "compensatory_mutations": [
               { "mutation": "Suggested mutation", "reasoning": "Mechanism", "confidence": 0.0-1.0 }
             ]
          },
          "predictions": {
            "native": { "plddt_avg": 0-100, "domains": ["Domain list"] },
            "mutant": { "plddt_avg": 0-100, "rmsd_to_native": 0-5.0, "domains_affected": ["Domain list"] },
            "delta": { "rmsd": 0-5.0, "confidence_drop": 0-100, "functional_impact": "Short impact phrase" }
          },
          "structuralImpact": {
            "domainAffected": "Protein domain disrupted",
            "confidence": 0-100,
            "prediction": "How 3D structure is altered"
          },
          "riskScore": 0-100,
          "confidence": 0-100
        }

        Be scientifically accurate. Base answers on known biological mechanisms.
      `;

      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      if (response.text) {
        return JSON.parse(response.text);
      }
    } catch (error) {
      console.warn("Gemini API failed, falling back to simulation.", error);
    }
  }

  // 2. Simulation Mode (Fallback)
  const knownVariant = DISEASE_VARIANTS.find(
    v => v.protein.toUpperCase() === gene.toUpperCase() && 
         (v.variant.toUpperCase() === variant.toUpperCase() || v.id.includes(variant))
  );

  if (knownVariant && MOCK_ANALYSIS[knownVariant.id]) {
    const mock = MOCK_ANALYSIS[knownVariant.id];
    const match = knownVariant.variant.match(/p\.([A-Z][a-z]{0,2})?(\d+)/);
    const pos = match ? parseInt(match[2], 10) : 1;
    const seq = knownVariant.sequence;
    
    return {
      variant: {
        protein: knownVariant.protein,
        hgvs: knownVariant.variant,
        disease: knownVariant.disease,
        id: knownVariant.id,
        uniprot: knownVariant.uniprot_id,
        sequence: knownVariant.sequence,
        mutantSequence: seq, 
        mutationPositionInSnippet: pos
      },
      mechanism: knownVariant.mechanism_summary,
      analysis: mock.aiAnalysis || { summary: 'No analysis available', compensatory_mutations: [] },
      predictions: mock.predictions,
      riskScore: 90,
      confidence: 95,
      proteinChange: knownVariant.variant,
      consequence: "missense"
    };
  }

  let hash = 0;
  const str = query.toUpperCase();
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.abs(hash);
  const plddtNative = 85 + (seed % 15);
  const rmsd = 0.5 + ((seed % 40) / 10);
  const plddtMutant = plddtNative - (rmsd * 5) - (seed % 10);
  const dummyWT = "M" + "L".repeat(30) + "A" + "L".repeat(30);
  const dummyMut = "M" + "L".repeat(30) + "P" + "L".repeat(30);

  return {
    variant: {
      protein: gene.toUpperCase(),
      hgvs: variant,
      disease: "Simulated Analysis Mode",
      id: `sim-${gene}-${variant}`,
      uniprot: "SIMULATED",
      sequence: dummyWT,
      mutantSequence: dummyMut,
      mutationPositionInSnippet: 32
    },
    mechanism: "[SIMULATION] The system does not have cached data for this specific variant and no API key is provided. The analysis below is procedurally generated to demonstrate the UI capabilities.",
    analysis: {
      summary: `Simulation: The mutation in ${gene} is predicted to destabilize the local fold (RMSD ${rmsd.toFixed(2)}Å).`,
      compensatory_mutations: [
         { mutation: "Simulated-M1", reasoning: "Hypothetical stabilizer", confidence: 0.5 }
      ]
    },
    predictions: {
      native: { plddt_avg: plddtNative, domains: ["Simulated Domain"] },
      mutant: { plddt_avg: plddtMutant, rmsd_to_native: rmsd, domains_affected: ["Local Motif"] },
      delta: { rmsd: rmsd, confidence_drop: plddtNative - plddtMutant, functional_impact: "Predicted Instability" }
    },
    riskScore: 50 + (seed % 40),
    confidence: 60,
    proteinChange: variant,
    consequence: "missense"
  };
};

export class ProteinChatSession {
  private ai: GoogleGenAI | null = null;
  private chat: Chat | null = null;
  private model = "gemini-3-pro-preview";
  private history: HistoryItem[] = [];
  private contextData: any = {};

  constructor(contextData: string, history: HistoryItem[] = []) {
    this.history = history;
    try {
      this.contextData = JSON.parse(contextData);
    } catch (e) {
      console.warn("Failed to parse context data for prompt generation");
    }
    this.initializeChat();
  }

  private initializeChat() {
    // Initializing GoogleGenAI with process.env.API_KEY directly as per guidelines
    if (!process.env.API_KEY) return; 

    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const parsedData = this.contextData;
    const nativePLDDT = parsedData.predictions?.native?.plddt_avg?.toFixed(1) ?? 'N/A';
    const mutantPLDDT = parsedData.predictions?.mutant?.plddt_avg?.toFixed(1) ?? 'N/A';
    const rmsd = parsedData.predictions?.delta?.rmsd?.toFixed(2) ?? 'N/A';
    const variantId = parsedData.variant?.id || 'Unknown Variant';
    
    const systemInstruction = `
      You are an expert Structural Biologist assistant named "Helix".
      Analyzing variant: ${variantId}
      Structure Data:
      - Native pLDDT: ${nativePLDDT}
      - Mutant pLDDT: ${mutantPLDDT}
      - RMSD: ${rmsd} Å
      
      Answer questions about these metrics and the mechanism provided in the context.
    `;

    try {
      this.chat = this.ai.chats.create({
        model: this.model,
        config: { systemInstruction },
        history: this.history
      });
    } catch (error) {
      console.error("Failed to create chat session:", error);
    }
  }

  async *sendMessage(message: string): AsyncGenerator<string, void, unknown> {
    if (!this.chat) {
      if (process.env.API_KEY) this.initializeChat();
      
      if (!this.chat) {
        const mockResponses = [
          `[SIMULATION] Based on the structural metrics, this variant shows a deviation. (Set API_KEY for live chat)`,
          `[SIMULATION] The conservation score suggests this residue is critical.`,
        ];
        yield mockResponses[Math.floor(Math.random() * mockResponses.length)];
        return;
      }
    }
    
    try {
      const responseStream = await this.chat.sendMessageStream({ message });
      for await (const chunk of responseStream) {
        const c = chunk as GenerateContentResponse;
        if (c.text) yield c.text;
      }
    } catch (error: any) {
      yield `Error contacting AI assistant: ${error.message}`;
    }
  }
}
