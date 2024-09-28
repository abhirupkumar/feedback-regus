import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { NextResponse } from 'next/server';
import axios from 'axios';

const ASSEMBLY_AI_API_KEY = process.env.ASSEMBLY_AI_API_KEY;

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

export async function POST(request) {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const filePath = path.resolve('uploads', file.name);

    // Save file to local filesystem
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    try {
        // Upload audio file to AssemblyAI
        const audioUrl = await uploadAudioToAssemblyAI(filePath);

        // Get transcription and sentiment analysis
        const result = await getTranscriptionAndSentiment(audioUrl);

        // Delete the uploaded file after processing
        fs.unlinkSync(filePath);

        // Send transcription and sentiment analysis back to client
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error processing audio file:', error);
        return NextResponse.json({ error: 'Failed to process audio file' }, { status: 500 });
    }
}

// Function to upload audio file to AssemblyAI
const uploadAudioToAssemblyAI = async (filePath) => {
    const file = fs.readFileSync(filePath);
    const response = await axios.post('https://api.assemblyai.com/v2/upload', file, {
        headers: {
            authorization: ASSEMBLY_AI_API_KEY,
            'content-type': 'application/octet-stream',
        },
    });
    return response.data.upload_url;
};

// Function to get transcription and sentiment analysis with polling logic
const getTranscriptionAndSentiment = async (audioUrl) => {
    const response = await axios.post(
        'https://api.assemblyai.com/v2/transcript',
        {
            audio_url: audioUrl,
            sentiment_analysis: true,
        },
        {
            headers: {
                authorization: ASSEMBLY_AI_API_KEY,
            },
        }
    );

    const transcriptId = response.data.id;

    // Polling function to check transcript status
    return new Promise((resolve, reject) => {
        const checkStatus = async () => {
            try {
                const transcriptionResult = await axios.get(
                    `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
                    {
                        headers: {
                            authorization: ASSEMBLY_AI_API_KEY,
                        },
                    }
                );
                const status = transcriptionResult.data.status;
                if (status === 'completed') {
                    resolve({
                        data: transcriptionResult.data
                    });
                } else if (status === 'failed') {
                    reject('Transcription failed.');
                } else {
                    setTimeout(checkStatus, 5000);
                }
            } catch (error) {
                // console.log(error)
                reject('Error fetching transcription status:', error);
            }
        };

        checkStatus();
    });
};
