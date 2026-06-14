/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Delete, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { AppSettings } from '../types';

interface PinScreenProps {
  settings: AppSettings;
  onUnlock: () => void;
  onSetPin: (newPin: string, hint?: string, userName?: string) => void;
}

export default function PinScreen({ settings, onUnlock, onSetPin }: PinScreenProps) {
  const [pinInput, setPinInput] = useState<string>('');
  const [errorStatus, setErrorStatus] = useState<boolean>(false);
  const [isSetupMode, setIsSetupMode] = useState<boolean>(!settings.isPinSet || settings.pin === '');
  const [setupStep, setSetupStep] = useState<number>(1); // 1 = enter new pin, 2 = confirm new pin, 3 = set hint
  const [tempPin, setTempPin] = useState<string>('');
  const [showHint, setShowHint] = useState<boolean>(false);
  const [customHint, setCustomHint] = useState<string>('');
  const [customName, setCustomName] = useState<string>(settings.userName || '');

  const [lastTypedIndex, setLastTypedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (pinInput.length > 0) {
      setLastTypedIndex(pinInput.length - 1);
      const timer = setTimeout(() => {
        setLastTypedIndex(null);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setLastTypedIndex(null);
    }
  }, [pinInput.length]);

  useEffect(() => {
    // If PIN is loaded empty, trigger setup mode automatically
    if (!settings.isPinSet || settings.pin === '') {
      setIsSetupMode(true);
      setSetupStep(1);
    } else {
      setIsSetupMode(false);
    }
  }, [settings]);

  const handleKeyPress = (val: string) => {
    if (setupStep === 3) return; // PIN hint is normal text input
    if (pinInput.length < 4) {
      setErrorStatus(false);
      setPinInput(prev => prev + val);
    }
  };

  const handleBackspace = () => {
    if (setupStep === 3) return;
    setErrorStatus(false);
    setPinInput(prev => prev.slice(0, -1));
  };

  const handleVerify = (pinToVerify?: string) => {
    const pin = pinToVerify !== undefined ? pinToVerify : pinInput;
    if (pin.length === 0) return;

    if (isSetupMode) {
      if (setupStep === 1) {
        if (pin.length !== 4) {
          setErrorStatus(true);
          return;
        }
        // Temporarily store pin and proceed to confirm
        setTempPin(pin);
        setPinInput('');
        setSetupStep(2);
      } else if (setupStep === 2) {
        // Confirm PIN check
        if (pin === tempPin) {
          setPinInput('');
          setSetupStep(3); // Next: Set customized security PIN Hint
        } else {
          // Failure mismatch
          setErrorStatus(true);
          setPinInput('');
          setSetupStep(1); // restart
        }
      }
    } else {
      // Unlock Verify
      if (pin === settings.pin) {
        onUnlock();
        setPinInput('');
        setErrorStatus(false);
      } else {
        setErrorStatus(true);
        // Haptic-like warning delay
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioCtx) {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.frequency.setValueAtTime(150, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.15);
        }
        setPinInput('');
      }
    }
  };

  const handleFinishSetup = () => {
    onSetPin(tempPin, customHint || 'No hint configured', customName || 'User');
    setIsSetupMode(false);
    setPinInput('');
    setSetupStep(1);
    onUnlock();
  };

  useEffect(() => {
    if (pinInput.length === 4 && setupStep !== 3) {
      handleVerify(pinInput);
    }
  }, [pinInput, isSetupMode, setupStep, tempPin, settings.pin, onUnlock]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 justify-between p-6">
      <div className="flex flex-col items-center mt-12 text-center">
        {/* Visual Brand Icon */}
        <motion.div
          animate={errorStatus ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className={`h-16 w-16 rounded-full flex items-center justify-center shadow-lg border mb-5 ${
            errorStatus
              ? 'bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800 text-red-500'
              : isSetupMode
              ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
              : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {isSetupMode ? <ShieldCheck className="h-8 w-8 animate-pulse" /> : <Lock className="h-8 w-8" />}
        </motion.div>

        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          {isSetupMode ? 'Create New Profile PIN' : `Welcome ${settings.userName || 'User'}`}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xs">
          {isSetupMode
            ? setupStep === 1
              ? 'Secure your offline database. Enter a 4-Digit PIN to register.'
              : setupStep === 2
              ? 'Re-enter your 4-digit PIN to confirm database encryption.'
              : 'Add your profile details and optional security hint.'
            : 'Enter PIN to securely access offline financial records.'}
        </p>

        {errorStatus && (
          <p className="text-red-500 text-xs font-semibold mt-3 animate-bounce">
            {isSetupMode ? 'PINs do not match. Restarting config.' : 'Incorrect entry code. Try again.'}
          </p>
        )}
      </div>

      {setupStep === 3 ? (
        /* Setup step 3 hint and name input card style */
        <div className="flex-1 flex flex-col justify-center items-center px-4 max-w-xs mx-auto w-full space-y-4">
          <div className="w-full space-y-3">
            <div>
              <label className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold uppercase block tracking-wider mb-1 text-left">Your Profile Name</label>
              <input
                type="text"
                placeholder="e.g. Deepak"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-center outline-none ring-2 ring-transparent focus:ring-indigo-500 transition-all font-sans font-medium"
                autoFocus
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase block tracking-wider mb-1 text-left">PIN Hint (Self Reminders)</label>
              <input
                type="text"
                placeholder="e.g. Last digits of my phone number"
                value={customHint}
                onChange={(e) => setCustomHint(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-center outline-none ring-2 ring-transparent focus:ring-indigo-500 transition-all font-sans font-medium"
              />
            </div>
          </div>
          <button
            onClick={handleFinishSetup}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all duration-150 border border-indigo-500/30"
          >
            Save Profile & Access PIN
          </button>
        </div>
      ) : (
        <>
          {/* Code Entry dots indicator */}
          <div className="flex flex-col items-center my-6">
            <div className="flex gap-4 justify-center items-center h-8">
              {[0, 1, 2, 3].map(index => {
                const isFilled = index < pinInput.length;
                const isRevealed = lastTypedIndex === index;
                return (
                  <div
                    key={index}
                    className={`h-8 w-8 rounded-full border-2 transition-all duration-200 flex items-center justify-center text-xs font-black font-mono ${
                      isFilled
                        ? 'bg-indigo-600 border-indigo-600 text-white scale-110 shadow'
                        : 'bg-transparent border-slate-300 dark:border-slate-700 text-transparent'
                    }`}
                  >
                    {isRevealed && isFilled ? pinInput[index] : isFilled ? '★' : ''}
                  </div>
                );
              })}
            </div>
            
            {/* Quick Hint Option for development testing */}
            <button
              onClick={() => setShowHint(!showHint)}
              className="mt-4 flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors cursor-pointer"
            >
              <HelpCircle className="h-3 w-3" />
              {showHint ? `Security Hint: ${settings.pinHint || 'None configured'}` : 'Need a hint?'}
            </button>
          </div>

          {/* Numberpad Pad Grid */}
          <div className="mb-8 max-w-sm mx-auto w-full">
            <div className="grid grid-cols-3 gap-y-4 gap-x-6 justify-items-center">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  onClick={() => handleKeyPress(num)}
                  className="h-14 w-14 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 active:scale-90 text-xl font-bold text-slate-800 dark:text-slate-100 shadow-sm border border-slate-100 dark:border-slate-800 transition-all duration-150 flex items-center justify-center cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => handleVerify()}
                className="h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white flex items-center justify-center shadow-md cursor-pointer transition-all duration-150 border border-indigo-500/30"
                title="Verify Lock PIN"
              >
                <ArrowRight className="h-6 w-6" />
              </button>
              <button
                onClick={() => handleKeyPress('0')}
                className="h-14 w-14 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 active:scale-95 text-xl font-bold text-slate-800 dark:text-slate-100 shadow-sm border border-slate-100 dark:border-slate-805 transition-all flex items-center justify-center cursor-pointer"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                className="h-14 w-14 rounded-full hover:bg-slate-100 dark:hover:bg-slate-805 text-slate-500 dark:text-slate-400 flex items-center justify-center cursor-pointer active:scale-90 transition-all"
              >
                <Delete className="h-5 w-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
