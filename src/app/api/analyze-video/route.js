import { GoogleGenerativeAI } from '@google/generative-ai';
import formidable from 'formidable';
import fs from 'fs/promises';
import { NextResponse } from 'next/server';

export const config = {
    api: {
        bodyParser: false,
    },
};

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);

export async function POST(req) {
    if (req.method !== 'POST') {
        return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
    }

    try {
        // Parse the incoming form data
        const formData = await req.formData();
        const videoFile = formData.get('video');
        const arrayBuffer = await videoFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Video = buffer.toString('base64');

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

        const input = {
            inlineData: {
                mimeType: videoFile.mimetype,
                data: base64Video
            }
        };

        const prompt = `
        'The video provided is an answer to the question: Tell me about yourself.Analyze this video for the following aspects:',
            1. Technical response: Evaluate the accuracy and depth of the technical information provided.,
            2. Soft skills: Assess communication skills, clarity of explanation, and overall presentation.,
            3. Body language: Analyze posture, gestures, and facial expressions.,
            Provide suggestions for improvement in each area.'
            output format:
            {
                "technical_response": {
                    "accuracy": ...,
                    "depth": ...
                },
                "soft_skills": {
                    "communication_skills": ...,
                    "clarity_of_explanation": ...,
                    "presentation": ...
                },
                "body_language": {
                    "posture": ...,
                    "gestures": ...,
                    "facial_expressions": ...
                },
                "feedback": {
                    "suggesstion": "..."
                }
            }`

        const result = await model.generateContent([
            prompt,
            input
        ]);

        const analysisText = result.response.text();
        console.log

        // Clean up the temporary file
        await fs.unlink(videoFile.filepath);

        // Send the analysis results
        return NextResponse.json({ analysis: analysisText }, { status: 200 });
    } catch (error) {
        console.error('Error analyzing video:', error);
        return NextResponse.json({ error: 'An error occurred while analyzing the video' }, { status: 500 });
    }
}