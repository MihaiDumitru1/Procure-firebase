import { useState } from 'react';
import { MessageCircle, Send, CheckCircle2, Paperclip, Globe, X, Users, Plus, Bell, BellOff, Trophy, Lock } from 'lucide-react';
import { Question } from '@/types/tender';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface QuestionsSectionProps {
  questions: Question[];
  canAnswer?: boolean;
  canAsk?: boolean;
  supplierName?: string;
  tenderStatus?: string;
  onChange?: (questions: Question[]) => void;
}

interface SupportDocument {
  name: string;
  size: string;
}

export function QuestionsSection({
  questions: initialQuestions,
  canAnswer = false,
  canAsk = false,
  supplierName,
  tenderStatus = 'active',
  onChange,
}: QuestionsSectionProps) {
  const [questions, setQuestionsRaw] = useState<Question[]>(initialQuestions);
  const setQuestions: typeof setQuestionsRaw = (updater) => {
    setQuestionsRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      onChange?.(next);
      return next;
    });
  };
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [broadcastAll, setBroadcastAll] = useState(true);
  const [attachedDocs, setAttachedDocs] = useState<SupportDocument[]>([]);

  // New question form (supplier)
  const [askingOpen, setAskingOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [submittingQ, setSubmittingQ] = useState(false);

  const isClosed = tenderStatus === 'closed' || tenderStatus === 'awarded';

  const unanswered = questions.filter(q => !q.answer);
  const answered = questions.filter(q => q.answer);

  const handleAttachFile = () => {
    const mockFiles: SupportDocument[] = [
      { name: 'Clarification-Note.pdf', size: '124 KB' },
      { name: 'Updated-Requirements.pdf', size: '2.1 MB' },
      { name: 'Technical-Addendum.docx', size: '540 KB' },
    ];
    const notAttached = mockFiles.filter(f => !attachedDocs.some(a => a.name === f.name));
    if (notAttached.length > 0) {
      setAttachedDocs(prev => [...prev, notAttached[0]]);
    }
  };

  const handleRemoveDoc = (name: string) => {
    setAttachedDocs(prev => prev.filter(d => d.name !== name));
  };

  const handleSubmitAnswer = (questionId: string) => {
    if (!answerText.trim()) return;
    setQuestions(prev => prev.map(q =>
      q.id === questionId
        ? {
            ...q,
            answer: answerText,
            answeredBy: 'Organizator',
            answeredAt: new Date().toISOString(),
          }
        : q
    ));
    setAnsweringId(null);
    setAnswerText('');
    setBroadcastAll(true);
    setAttachedDocs([]);
  };

  const handleCancel = () => {
    setAnsweringId(null);
    setAnswerText('');
    setBroadcastAll(true);
    setAttachedDocs([]);
  };

  const handleAskQuestion = () => {
    if (!newQuestion.trim()) return;
    setSubmittingQ(true);
    setTimeout(() => {
      const q: Question = {
        id: `q-${Date.now()}`,
        question: newQuestion.trim(),
        askedBy: supplierName ?? 'Furnizor',
        askedAt: new Date().toISOString(),
        answer: undefined,
        answeredBy: undefined,
        answeredAt: undefined,
      };
      setQuestions(prev => [q, ...prev]);
      setNewQuestion('');
      setAskingOpen(false);
      setSubmittingQ(false);
    }, 400);
  };

  const renderQuestion = (question: Question) => (
    <div
      key={question.id}
      className={cn(
        'p-4 rounded-lg border',
        question.answer
          ? 'border-border bg-muted/20'
          : 'border-status-active/30 bg-status-active/5'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-2 rounded-full shrink-0',
          question.answer ? 'bg-status-awarded/20' : 'bg-status-active/20'
        )}>
          {question.answer ? (
            <CheckCircle2 className="h-4 w-4 text-status-awarded" />
          ) : (
            <MessageCircle className="h-4 w-4 text-status-active-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Question header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground">
              {new Date(question.askedAt).toLocaleDateString('ro-RO')}
            </span>
            {question.answer && (
              <span className="inline-flex items-center gap-1 text-xs text-status-awarded bg-status-awarded/10 px-1.5 py-0.5 rounded-full">
                <Globe className="h-3 w-3" />
                Transmis tuturor
              </span>
            )}
            {/* Show "my question" badge only to the supplier who asked */}
            {canAsk && question.askedBy === supplierName && (
              <Badge variant="outline" className="text-xs h-4 px-1.5">Întrebarea mea</Badge>
            )}
          </div>

          {/* Question text */}
          <p className="text-sm text-foreground font-medium">{question.question}</p>
          {canAnswer && !question.answer && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Întrebat de: <span className="text-foreground">{question.askedBy}</span>
            </p>
          )}

          {/* Answer block */}
          {question.answer && (
            <div className="mt-3 pl-4 border-l-2 border-primary/30">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-primary">{question.answeredBy ?? 'Organizator'}</span>
                <span className="text-xs text-muted-foreground">
                  {question.answeredAt ? new Date(question.answeredAt).toLocaleDateString('ro-RO') : ''}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{question.answer}</p>
            </div>
          )}

          {/* Answer form — organizer */}
          {!question.answer && canAnswer && (
            <div className="mt-3">
              {answeringId === question.id ? (
                <div className="space-y-3 bg-muted/30 rounded-lg p-3 border border-border">
                  <Textarea
                    placeholder="Scrieți răspunsul aici..."
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    className="min-h-[80px] bg-background"
                  />

                  {attachedDocs.length > 0 && (
                    <div className="space-y-1">
                      {attachedDocs.map(doc => (
                        <div key={doc.name} className="flex items-center gap-2 text-xs bg-background border border-border rounded px-2 py-1.5">
                          <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="flex-1 truncate text-foreground">{doc.name}</span>
                          <span className="text-muted-foreground">{doc.size}</span>
                          <button onClick={() => handleRemoveDoc(doc.name)}>
                            <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-start gap-3 p-2.5 rounded-md bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 mt-0.5">
                      <Switch
                        id={`broadcast-${question.id}`}
                        checked={broadcastAll}
                        onCheckedChange={setBroadcastAll}
                      />
                      <Label htmlFor={`broadcast-${question.id}`} className="text-xs font-medium text-foreground cursor-pointer">
                        Răspunde tuturor
                      </Label>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {broadcastAll ? (
                          <span className="flex items-start gap-1">
                            <Users className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                            <span>
                              Răspunsul va fi distribuit anonim <strong className="text-foreground">tuturor participanților</strong>. Identitatea furnizorului nu va fi dezvăluită.
                            </span>
                          </span>
                        ) : 'Răspunsul va fi trimis doar furnizorului care a pus întrebarea.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => handleSubmitAnswer(question.id)} disabled={!answerText.trim()}>
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      {broadcastAll ? 'Trimite tuturor' : 'Trimite răspuns'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleAttachFile} className="gap-1.5">
                      <Paperclip className="h-3.5 w-3.5" />
                      Atașează document
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancel}>Anulează</Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setAnsweringId(question.id)}>
                  Răspunde la întrebare
                </Button>
              )}
            </div>
          )}

          {/* Pending note for supplier */}
          {canAsk && !question.answer && question.askedBy === supplierName && (
            <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
              <Bell className="h-3 w-3" />
              Așteptați răspuns de la organizator
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-card rounded-lg border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">Întrebări & Răspunsuri</h3>
          {unanswered.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-status-active/20 text-status-active-foreground">
              {unanswered.length} în așteptare
            </span>
          )}
        </div>
        {canAsk && !isClosed && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAskingOpen(v => !v)}>
            <Plus className="h-3.5 w-3.5" />
            Adaugă întrebare
          </Button>
        )}
        {canAsk && isClosed && (
          <Badge variant="secondary" className="gap-1 text-xs">
            <Lock className="h-3 w-3" />
            Licitație închisă
          </Badge>
        )}
      </div>

      {/* New question form (supplier) */}
      {canAsk && askingOpen && !isClosed && (
        <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
          <p className="text-xs text-muted-foreground font-medium">Întrebarea dvs. va fi transmisă organizatorului. Răspunsul va fi difuzat anonim tuturor participanților.</p>
          <Input
            placeholder="Scrieți întrebarea dvs. aici..."
            value={newQuestion}
            onChange={e => setNewQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAskQuestion(); if (e.key === 'Escape') { setAskingOpen(false); setNewQuestion(''); } }}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleAskQuestion} disabled={!newQuestion.trim() || submittingQ} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              {submittingQ ? 'Se trimite...' : 'Trimite întrebarea'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAskingOpen(false); setNewQuestion(''); }}>Anulează</Button>
          </div>
        </div>
      )}

      {/* Info bar for suppliers */}
      {canAsk && answered.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
          <Globe className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span>Toate răspunsurile de mai jos au fost difuzate anonim tuturor participanților la licitație.</span>
        </div>
      )}

      {questions.length > 0 ? (
        <div className="space-y-3">
          {unanswered.map(renderQuestion)}
          {answered.map(renderQuestion)}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-6">
          {canAsk
            ? 'Nu există întrebări încă. Puteți adresa o întrebare organizatorului.'
            : 'Nu s-au pus întrebări încă.'}
        </p>
      )}
    </div>
  );
}
