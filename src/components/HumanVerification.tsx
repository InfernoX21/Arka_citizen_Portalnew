import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, RefreshCw, CheckCircle2, Bot, HelpCircle, Sparkles } from 'lucide-react';

interface HumanVerificationProps {
  onVerify: (token: string) => void;
  onReset: () => void;
  isVerified: boolean;
}

interface QuestionChallenge {
  prompt: string;
  options: number[];
  correctAnswer: number;
}

export const HumanVerification: React.FC<HumanVerificationProps> = ({
  onVerify,
  onReset,
  isVerified,
}) => {
  const [challenge, setChallenge] = useState<QuestionChallenge | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  // Generate a random interactive math/logic challenge with 4 options
  const generateNewChallenge = useCallback(() => {
    const operations = ['+', '-', '*'];
    const op = operations[Math.floor(Math.random() * operations.length)];
    let num1 = 0;
    let num2 = 0;
    let answer = 0;
    let prompt = '';

    if (op === '+') {
      num1 = Math.floor(Math.random() * 12) + 3;
      num2 = Math.floor(Math.random() * 12) + 2;
      answer = num1 + num2;
      prompt = `Solve to verify: What is ${num1} + ${num2}?`;
    } else if (op === '-') {
      num1 = Math.floor(Math.random() * 15) + 10;
      num2 = Math.floor(Math.random() * 8) + 2;
      answer = num1 - num2;
      prompt = `Solve to verify: What is ${num1} - ${num2}?`;
    } else {
      num1 = Math.floor(Math.random() * 6) + 2;
      num2 = Math.floor(Math.random() * 5) + 2;
      answer = num1 * num2;
      prompt = `Solve to verify: What is ${num1} × ${num2}?`;
    }

    // Generate 3 plausible unique wrong options
    const optionsSet = new Set<number>();
    optionsSet.add(answer);

    while (optionsSet.size < 4) {
      const offset = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 5) + 1);
      const wrong = Math.max(1, answer + offset);
      optionsSet.add(wrong);
    }

    // Shuffle options
    const shuffledOptions = Array.from(optionsSet).sort(() => Math.random() - 0.5);

    setChallenge({
      prompt,
      options: shuffledOptions,
      correctAnswer: answer,
    });
    setSelectedOption(null);
    setErrorMsg('');
  }, []);

  useEffect(() => {
    generateNewChallenge();
  }, [generateNewChallenge]);

  // Handle user clicking an answer option
  const handleSelectOption = (opt: number) => {
    if (isVerified || isChecking || !challenge) return;
    setSelectedOption(opt);
    setIsChecking(true);
    setErrorMsg('');

    setTimeout(() => {
      if (opt === challenge.correctAnswer) {
        // Success: Generate verification token
        const token = `human_verified_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        onVerify(token);
      } else {
        // Incorrect answer
        setErrorMsg('Incorrect answer! A new question has been generated.');
        generateNewChallenge();
      }
      setIsChecking(false);
    }, 400);
  };

  const handleReset = () => {
    generateNewChallenge();
    onReset();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
          Mandatory Human Verification
        </label>
        <span className="text-[10px] text-rose-400 font-bold tracking-wider uppercase">
          * Required
        </span>
      </div>

      <div
        className={`relative overflow-hidden rounded-2xl border transition-all p-3.5 ${
          isVerified
            ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
            : 'bg-zinc-900/90 border-zinc-700/70 shadow-inner'
        }`}
      >
        {isVerified ? (
          /* Verified state with badge */
          <div className="flex items-center justify-between py-1 px-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/30">
                <CheckCircle2 className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  Verified as Human
                  <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                </p>
                <p className="text-[10px] text-emerald-500/90 font-medium">
                  Challenge completed successfully
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              title="Retake challenge"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* Interactive Question Challenge */
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-zinc-200 font-semibold">
                <HelpCircle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                <span>{challenge?.prompt || 'Loading question...'}</span>
              </div>
              <button
                type="button"
                onClick={generateNewChallenge}
                title="Get another question"
                className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Answer Options Grid */}
            <div className="grid grid-cols-4 gap-2">
              {challenge?.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  disabled={isChecking}
                  onClick={() => handleSelectOption(opt)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all select-none ${
                    selectedOption === opt
                      ? 'bg-orange-500 text-white scale-95 shadow-md shadow-orange-500/30'
                      : 'bg-zinc-800/90 hover:bg-zinc-700/90 text-zinc-200 border border-zinc-700/60 hover:border-orange-500/50 active:scale-95'
                  } disabled:opacity-50`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-zinc-500 text-center">
              Click the correct answer above to prove you are human.
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
            <Bot className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};
