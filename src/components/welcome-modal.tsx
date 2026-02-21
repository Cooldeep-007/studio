
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface WelcomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName?: string;
}

export function WelcomeModal({ open, onOpenChange, userName }: WelcomeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-br from-blue-600 to-blue-500 text-white text-center items-center">
            <svg
                className="h-12 w-12 text-white mb-2"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 7L12 12L22 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 22V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            <DialogTitle className="text-2xl">Welcome to Pro Accounting! 🎉</DialogTitle>
        </DialogHeader>
        <div className="p-6 text-center space-y-4">
          <p className="text-base text-muted-foreground">
            Thank you for choosing Pro Accounting, {userName || 'friend'}.
            Your company workspace has been successfully created.
          </p>
          <p className="text-sm text-muted-foreground">
            You can now create ledgers, items, vouchers and manage GST with ease.
            If you need help, visit the Help section or contact support.
          </p>
          <p className="font-semibold">Let’s grow your business smarter.</p>
        </div>
        <DialogFooter className="p-6 pt-0 bg-secondary/50 sm:justify-center">
          <Button type="button" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Let's Get Started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
