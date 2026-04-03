'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import { setStorageItem, STORAGE_KEYS } from '@/lib/storage';
import { useRouter } from 'next/navigation';

const questions = [
  {
    id: 1,
    question: 'Do you have any chronic conditions?',
    options: ['None', 'Diabetes', 'Hypertension', 'Asthma', 'Other'],
  },
  {
    id: 2,
    question: 'How often do you exercise?',
    options: ['Daily', '3-4 times a week', '1-2 times a week', 'Rarely', 'Never'],
  },
  {
    id: 3,
    question: 'How would you rate your sleep quality?',
    options: ['Excellent', 'Good', 'Fair', 'Poor'],
  },
  {
    id: 4,
    question: 'Do you smoke or use tobacco products?',
    options: ['Never', 'Occasionally', 'Regularly', 'Quit recently'],
  },
  {
    id: 5,
    question: 'How would you describe your stress levels?',
    options: ['Very Low', 'Low', 'Moderate', 'High', 'Very High'],
  },
];

export default function AssessmentPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const router = useRouter();

  const handleAnswer = (answer: string) => {
    setAnswers({ ...answers, [questions[currentQuestion].id]: answer });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Complete assessment
      setStorageItem(STORAGE_KEYS.HEALTH_ASSESSMENT_COMPLETE, true);
      setStorageItem(STORAGE_KEYS.HEALTH_DATA, answers);
      router.push('/home');
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const currentAnswer = answers[questions[currentQuestion].id];

  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <Link href="/home">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Health Assessment</h1>
            <Progress value={progress} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Question {currentQuestion + 1} of {questions.length}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="h-full flex flex-col"
          >
            <Card className="flex-1 p-6 flex flex-col justify-center">
              <h2 className="text-2xl font-semibold mb-8 text-center">
                {questions[currentQuestion].question}
              </h2>
              <div className="space-y-3">
                {questions[currentQuestion].options.map((option) => (
                  <motion.button
                    key={option}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAnswer(option)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      currentAnswer === option
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option}</span>
                      {currentAnswer === option && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                        >
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="sticky bottom-16 bg-background border-t border-border p-4">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          <Button
            onClick={handleNext}
            disabled={!currentAnswer}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            {currentQuestion === questions.length - 1 ? 'Complete' : 'Next'}
            {currentQuestion < questions.length - 1 && (
              <ArrowRight className="w-4 h-4 ml-2" />
            )}
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

