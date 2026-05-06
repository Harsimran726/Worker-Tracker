import { useState, useEffect, useCallback, useRef } from 'react';

// Extend the window object to include the prefixed SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useSpeechToText(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  const savedOnResult = useRef(onResult);

  useEffect(() => {
    savedOnResult.current = onResult;
  }, [onResult]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognizer = new SpeechRecognition();
      recognizer.continuous = true;
      // We can use 'pa-IN' for Punjabi. Or 'en-IN'. 
      // Setting to pa-IN will capture Punjabi.
      // recognizer.lang = 'pa-IN';
      recognizer.interimResults = true;

      recognizer.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          savedOnResult.current(finalTranscript);
        }
      };

      recognizer.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
          setIsSupported(false);
        }
        setIsListening(false);
      };

      recognizer.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognizer);
    }
  }, []);

  const toggleListening = useCallback((lang: 'en-IN' | 'pa-IN' = 'pa-IN') => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.lang = lang;
      try {
        recognition.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  }, [recognition, isListening]);

  return { isListening, isSupported, toggleListening };
}
