"use client";

import React, { useRef, useState } from "react";

const Recorder = () => {
  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const videoRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState("");

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    videoRef.current.srcObject = stream;

    mediaRecorderRef.current = new MediaRecorder(stream);
    mediaRecorderRef.current.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const videoBlob = new Blob(audioChunksRef.current, { type: "video/webm" });
      setIsProcessing(true);
      uploadAudio(audioBlob);
      analyzeVideo(videoBlob);
      audioChunksRef.current = [];
    };

    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
    videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
  };

  const uploadAudio = async (audioBlob) => {
    const formData = new FormData();
    formData.append("file", new File([audioBlob], "audio.webm"));

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    const { data } = result;
    console.log(data)
    if (data.text)
      setTranscription(data);
    console.log(data.sentiment_analysis_results)

  };

  const analyzeVideo = async (videoBlob) => {
    const formData = new FormData();
    formData.append('video', videoBlob);

    try {
      const response = await fetch('/api/analyze-video', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      console.log('Analysis:', data.analysis);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-4">Tell me about yourself?</h1>
      <video ref={videoRef} autoPlay muted className="mb-4 w-full max-w-lg border rounded" />
      <div>
        {!recording ? (
          <button
            onClick={startRecording}
            className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
          >
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="bg-red-500 text-white px-4 py-2 mr-2"
          >
            Stop Recording
          </button>
        )}
      </div>
      {isProcessing && <p className="mt-4">Processing audio...</p>}
      {
        transcription && transcription.text && (
          <div className="mt-4">
            <h2 className="text-lg font-bold">Transcription:</h2>
            <p>{transcription.text}</p>
          </div>
        )
      }
      {
        transcription && transcription.sentiment_analysis_results && transcription.sentiment_analysis_results[0] && (
          <div className="mt-4">
            <h2 className="text-lg font-bold">Sentiment:</h2>
            <p>{transcription.sentiment_analysis_results[0].sentiment}</p>
          </div>
        )
      }
    </div>
  );
};

export default Recorder;
