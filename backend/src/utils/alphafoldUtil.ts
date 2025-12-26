/**
 * Backend utility for fetching AlphaFold structures
 * Implements the public AlphaFold DB API integration
 */

import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../prisma.js';
import { logger } from './logger.js';
import { auditAction } from './redactor.js';
import crypto from 'crypto';

// UNIPROT mapping for fusions/clinical genes
const uniprotMap: Record<string, string> = {
  'SMN1': 'Q16637',
  'CFTR': 'P13569',
  'BRCA1': 'P38398',
  'BRCA2': 'P51587',
  'ABL1': 'P00519', // BCR-ABL1
  'ALK': 'Q9UM73', // EML4-ALK
  'BCR': 'P11274', // BCR-ABL1
  'BCR-ABL1': 'P00519', // Direct mapping for fusion
  'EML4-ALK': 'Q9UM73' // Direct mapping for fusion
};

/**
 * Fetch structure from public AlphaFold DB and upload to our backend
 */
export const fetchAlphaFoldStructureBackend = async (gene: string): Promise<string> => {
  try {
    // UniProt mapping for fusions/clinical genes
    const uniprotId = uniprotMap[gene] || 'P00519' // ABL1 fallback
    console.log(`🔄 Fetching AlphaFold ${uniprotId} for ${gene}...`);

    // Try multiple approaches to get the AlphaFold structure
    let pdbBuffer: Buffer | null = null;

    // Try primary API endpoint
    const apiUrl = `https://alphafold.ebi.ac.uk/api/v1/model/${uniprotId}`;
    console.log(`Fetching from API: ${apiUrl}`);

    const response = await fetch(apiUrl);
    if (response.ok) {
      const data = await response.json() as any;
      const pdbUrl = data['pdbUrl'] || `https://alphafold.ebi.ac.uk/files/AF-${uniprotId}-F1-model_v4.pdb`;
      console.log(`Downloading PDB from: ${pdbUrl}`);

      const pdbResponse = await fetch(pdbUrl);
      if (pdbResponse.ok) {
        const pdbBlob = await pdbResponse.blob();
        const pdbArrayBuffer = await pdbBlob.arrayBuffer();
        pdbBuffer = Buffer.from(pdbArrayBuffer);
      }
    } else {
      // Try alternative endpoint format
      const alternativeApiUrl = `https://alphafold.ebi.ac.uk/api/prediction/${uniprotId}`;
      console.log(`Primary API failed, trying alternative: ${alternativeApiUrl}`);
      const altResponse = await fetch(alternativeApiUrl);

      if (altResponse.ok) {
        const data = await altResponse.json() as any;
        const pdbUrl = data['pdbUrl'] || `https://alphafold.ebi.ac.uk/files/AF-${uniprotId}-F1-model_v4.pdb`;
        console.log(`Downloading PDB from: ${pdbUrl}`);

        const pdbResponse = await fetch(pdbUrl);
        if (pdbResponse.ok) {
          const pdbBlob = await pdbResponse.blob();
          const pdbArrayBuffer = await pdbBlob.arrayBuffer();
          pdbBuffer = Buffer.from(pdbArrayBuffer);
        }
      } else {
        // Try direct access to PDB file
        const directPdbUrl = `https://alphafold.ebi.ac.uk/files/AF-${uniprotId}-F1-model_v4.pdb`;
        console.log(`Alternative API failed, trying direct: ${directPdbUrl}`);

        const directResponse = await fetch(directPdbUrl);
        if (directResponse.ok) {
          const pdbBlob = await directResponse.blob();
          const pdbArrayBuffer = await pdbBlob.arrayBuffer();
          pdbBuffer = Buffer.from(pdbArrayBuffer);
        } else {
          throw new Error(`AlphaFold API request failed with status ${response.status} and direct access failed with status ${directResponse.status}`);
        }
      }
    }

    if (!pdbBuffer) {
      throw new Error(`Could not retrieve PDB data for ${uniprotId}`);
    }

    // Create a temporary file
    const tempDir = './storage/temp';
    await fs.mkdir(tempDir, { recursive: true });

    const fileName = `${gene}_alphafold.pdb`;
    const tempPath = path.join(tempDir, fileName);

    await fs.writeFile(tempPath, pdbBuffer);

    // Store in database and move to proper location
    const checksum = crypto.createHash('sha256').update(pdbBuffer).digest('hex');
    const file_size = pdbBuffer.length;

    // For this implementation, we'll use a default variant ID since we don't have a specific one
    const variantId = 'cmjeu716j0001ygu7ixth77m0'; // BCR-ABL1 as per requirements

    const structureFile = await prisma.structureFile.create({
      data: {
        variantId: variantId,
        file_type: 'pdb',
        file_name: fileName,
        file_size: file_size,
        local_path: tempPath, // We can move this to permanent storage later
        checksum: checksum
      }
    });

    // Move to permanent storage location
    const permanentDir = './storage';
    await fs.mkdir(permanentDir, { recursive: true });
    const permanentPath = path.join(permanentDir, fileName);
    await fs.rename(tempPath, permanentPath);

    // Update the record with the new path
    await prisma.structureFile.update({
      where: { id: structureFile.id },
      data: { local_path: permanentPath }
    });

    // Audit log
    await auditAction(prisma, 'structure_fetched_from_alphafold', structureFile.id, 'StructureFile', null, {
      gene,
      uniprotId,
      file_type: 'pdb',
      file_name: fileName,
      file_size: file_size
    });

    console.log(`✅ ${gene} AlphaFold PDB uploaded:`, structureFile.id);
    return structureFile.id;
  } catch (error) {
    console.error(`Error fetching AlphaFold structure for gene ${gene}:`, error);
    throw error;
  }
};