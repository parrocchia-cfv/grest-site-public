'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Module } from '@/types/module';
import { buildStepSchema } from '@/lib/step-schema';
import { submitForm, updatePublicSubmission } from '@/lib/api-client';
import { getLabel, multilineI18nSx } from '@/lib/i18n';
import { DynamicField } from './DynamicField';
import { ThankYouView } from './ThankYouView';
import {
  Box,
  Button,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Alert,
} from '@mui/material';
import { FormCard } from './FormCard';
import {
  computeRepeatCount,
  defaultValueForField,
  expandVirtualSteps,
  fieldFormKey,
  getVisibleFieldsForContext,
  type RepeatSkipReason,
} from '@/lib/repeat-steps';
import { emailBodyIncludesRiepilogoPlaceholder } from '@/lib/email-on-submit-ux';
import { buildPublicEditSubmissionUrl } from '@/lib/public-site-url';
import { sanitizeResponsesBySchema } from '@/lib/sanitize-responses-by-schema';
import { getSubmittedEmailFromResponses } from '@/lib/thank-you-email';

const EMPTY_REPEAT_MESSAGE: Record<RepeatSkipReason, string> = {
  zero:
    'Nessuna voce da inserire per questa sezione. Puoi andare avanti quando sei pronto.',
  empty:
    'Compila il numero richiesto nello step precedente; senza quel valore questa parte resta vuota.',
  invalid:
    'Il numero indicato non è valido. Questa sezione viene saltata; verifica il campo nello step precedente.',
};

type FormValues = Record<string, unknown>;

function getDefaultValues(module: Module): FormValues {
  const values: FormValues = {};
  for (const step of module.steps) {
    if (step.repeatFromField) continue;
    for (const field of step.fields) {
      values[field.id] = defaultValueForField(field);
    }
  }
  return values;
}

function mergeInitialResponses(
  module: Module,
  initial: Record<string, unknown> | undefined
): FormValues {
  const base = getDefaultValues(module);
  if (!initial) return base;
  return { ...base, ...initial } as FormValues;
}

function lastVirtualIndexForModuleStep(
  virtualSteps: ReturnType<typeof expandVirtualSteps>,
  moduleStepIndex: number
): number {
  let last = -1;
  virtualSteps.forEach((vs, idx) => {
    if (vs.stepIndex === moduleStepIndex) last = idx;
  });
  return last;
}

export interface MultiStepFormProps {
  module: Module;
  /** Se valorizzato: flusso modifica invio esistente (PATCH), non nuovo POST. */
  submissionId?: string;
  /** Risposte già salvate (da GET submission); merge sui default del modulo. */
  initialResponses?: Record<string, unknown>;
}

export function MultiStepForm({
  module,
  submissionId,
  initialResponses,
}: MultiStepFormProps) {
  const [currentVirtual, setCurrentVirtual] = useState(0);
  const currentVirtualRef = useRef(0);
  currentVirtualRef.current = currentVirtual;

  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sanitizeNotice, setSanitizeNotice] = useState<string | null>(null);
  /** Token per link «Modifica»: di norma `submissionGroupId`, altrimenti id riga. */
  const [successEditUrlToken, setSuccessEditUrlToken] = useState<string | null>(null);
  /** Email mostrata nella thank-you (da `emailOnSubmit.toFieldId` nel payload inviato). */
  const [notifierEmail, setNotifierEmail] = useState<string | null>(null);

  const sanitizedInitial = useMemo(() => {
    const merged = mergeInitialResponses(module, initialResponses);
    if (!submissionId) {
      return { responses: merged, removed: [] as { fieldId: string; value: string }[] };
    }
    return sanitizeResponsesBySchema(module, merged);
  }, [module, initialResponses, submissionId]);

  const mergedDefaultValues = sanitizedInitial.responses;

  const methods = useForm<FormValues>({
    defaultValues: mergedDefaultValues,
    mode: 'onTouched',
    resolver: (values, context, options) => {
      const steps = expandVirtualSteps(module, values as FormValues);
      const vs = steps[currentVirtualRef.current];
      if (!vs) {
        return zodResolver(z.object({}).passthrough())(values, context, options);
      }
      if (vs.emptyRepeat) {
        return zodResolver(z.object({}).passthrough())(values, context, options);
      }
      const schema = buildStepSchema(vs.step, values as FormValues, {
        repeatIndex: vs.repeatIndex,
      });
      return zodResolver(schema)(values, context, options);
    },
  });

  const { reset, getValues, setValue, trigger } = methods;
  const watchedValues = useWatch({ control: methods.control });

  /** Snapshot completo per condizioni e step ripetuti (include tutti gli step già compilati). */
  const allValues = useMemo(
    () => ({ ...mergedDefaultValues, ...getValues() } as FormValues),
    [mergedDefaultValues, watchedValues, getValues]
  );

  const virtualSteps = useMemo(
    () => expandVirtualSteps(module, allValues),
    [module, allValues]
  );

  const currentVs = virtualSteps[currentVirtual] ?? virtualSteps[0];
  const isLastStep = virtualSteps.length > 0 && currentVirtual === virtualSteps.length - 1;

  const visibleFields = useMemo(() => {
    if (!currentVs || currentVs.emptyRepeat) return [];
    return getVisibleFieldsForContext(
      currentVs.step,
      allValues,
      currentVs.repeatIndex
    );
  }, [currentVs, allValues]);

  useEffect(() => {
    document.title = getLabel(module.meta.title, 'it');
    return () => {
      document.title = 'Modulo iscrizione';
    };
  }, [module.meta.title]);

  useEffect(() => {
    reset(sanitizedInitial.responses);
    setCurrentVirtual(0);
    setSubmitted(false);
    setSubmitError(null);
    setSuccessEditUrlToken(null);
    setNotifierEmail(null);
    if (submissionId && sanitizedInitial.removed.length > 0) {
      if (process.env.NODE_ENV !== 'production') {
        for (const r of sanitizedInitial.removed) {
          console.info(`[sanitize] removed disabled option: ${r.fieldId} -> ${r.value}`);
        }
      }
      setSanitizeNotice(
        'Alcune scelte non piu disponibili sono state rimosse automaticamente.'
      );
    } else {
      setSanitizeNotice(null);
    }
  }, [submissionId, sanitizedInitial, reset]);

  useEffect(() => {
    const vals = getValues();
    for (const step of module.steps) {
      if (!step.repeatFromField) continue;
      const cfg = step.repeatFromField;
      const N = computeRepeatCount(vals, cfg);
      const cap = cfg.maxCount != null ? Math.min(cfg.maxCount + 20, 300) : 300;
      for (const field of step.fields) {
        for (let i = 0; i < N; i++) {
          const key = `${field.id}_${i}`;
          if (getValues(key) === undefined) {
            setValue(key, defaultValueForField(field), {
              shouldDirty: false,
              shouldValidate: false,
            });
          }
        }
        for (let i = N; i < cap; i++) {
          const key = `${field.id}_${i}`;
          if (getValues(key) !== undefined) {
            setValue(key, defaultValueForField(field), {
              shouldDirty: false,
              shouldValidate: false,
            });
          }
        }
      }
    }
  }, [module, watchedValues, getValues, setValue]);

  useEffect(() => {
    if (virtualSteps.length === 0) return;
    setCurrentVirtual((i) => Math.min(i, virtualSteps.length - 1));
  }, [virtualSteps.length]);

  const onNext = useCallback(async () => {
    const vs = virtualSteps[currentVirtual];
    if (!vs) return;
    if (vs.emptyRepeat) {
      setCurrentVirtual((s) => s + 1);
      return;
    }
    const keys = visibleFields.map((f) =>
      fieldFormKey(f.id, vs.step, vs.repeatIndex)
    );
    const valid = keys.length === 0 ? true : await trigger(keys);
    if (valid) setCurrentVirtual((s) => s + 1);
  }, [trigger, virtualSteps, currentVirtual, visibleFields]);

  const onPrev = useCallback(() => {
    setCurrentVirtual((s) => Math.max(0, s - 1));
  }, []);

  const handleSubmitForm = methods.handleSubmit;
  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (!isLastStep) {
        return;
      }
      setSubmitError(null);
      try {
        if (submissionId) {
          const sanitized = sanitizeResponsesBySchema(
            module,
            values as Record<string, unknown>
          );
          if (sanitized.removed.length > 0) {
            if (process.env.NODE_ENV !== 'production') {
              for (const r of sanitized.removed) {
                console.info(
                  `[sanitize] removed disabled option: ${r.fieldId} -> ${r.value}`
                );
              }
            }
            setSanitizeNotice(
              'Alcune scelte non piu disponibili sono state rimosse automaticamente.'
            );
            reset(sanitized.responses);
          }
          const payload = {
            moduleId: module.id,
            submittedAt: new Date().toISOString(),
            responses: sanitized.responses as Record<
              string,
              string | number | boolean | string[]
            >,
          };
          const res = await updatePublicSubmission(submissionId, payload);
          setNotifierEmail(
            getSubmittedEmailFromResponses(
              sanitized.responses,
              module.emailOnSubmit?.toFieldId
            )
          );
          const primary =
            res.submissionId?.trim() ||
            (res.submissionIds && res.submissionIds[0]?.trim()) ||
            null;
          setSuccessEditUrlToken(
            res.submissionGroupId?.trim() || primary || submissionId.trim() || null
          );
        } else {
          const payload = {
            moduleId: module.id,
            submittedAt: new Date().toISOString(),
            responses: values as Record<string, string | number | boolean | string[]>,
          };
          const res = await submitForm(module.id, payload);
          setNotifierEmail(
            getSubmittedEmailFromResponses(
              values as Record<string, unknown>,
              module.emailOnSubmit?.toFieldId
            )
          );
          const primary =
            res.submissionId?.trim() ||
            (res.submissionIds && res.submissionIds[0]?.trim()) ||
            null;
          setSuccessEditUrlToken(res.submissionGroupId?.trim() || primary);
        }
        setSubmitted(true);
      } catch (e) {
        setSubmitError(
          e instanceof Error ? e.message : 'Impossibile inviare. Riprova tra poco.'
        );
      }
    },
    [isLastStep, module, submissionId]
  );

  const editSubmissionUrl =
    successEditUrlToken != null ? buildPublicEditSubmissionUrl(successEditUrlToken) : null;

  const onSubmitClick = useMemo(
    () => handleSubmitForm(onSubmit),
    [handleSubmitForm, onSubmit]
  );

  if (submitted) {
    return (
      <ThankYouView
        thankYou={module.meta.thankYou}
        emailOnSubmitEnabled={module.emailOnSubmit?.enabled === true}
        notifierEmail={notifierEmail}
        showRiepilogoInEmailHint={
          module.emailOnSubmit?.enabled === true &&
          emailBodyIncludesRiepilogoPlaceholder(module.emailOnSubmit?.body)
        }
        isUpdateAfterEdit={!!submissionId}
        editSubmissionUrl={editSubmissionUrl}
      />
    );
  }

  const progress =
    virtualSteps.length > 0
      ? ((currentVirtual + 1) / virtualSteps.length) * 100
      : 0;
  const stepIndexLabel = `Passo ${currentVirtual + 1} di ${virtualSteps.length || 1}`;

  const stepTitle = currentVs ? getLabel(currentVs.step.title, 'it') : '';

  const repeatSubtitle =
    currentVs &&
    !currentVs.emptyRepeat &&
    currentVs.repeatIndex !== null &&
    currentVs.step.repeatFromField
      ? (() => {
          const N = computeRepeatCount(allValues, currentVs.step.repeatFromField);
          return `Voce ${currentVs.repeatIndex + 1} di ${N}`;
        })()
      : null;

  const activeModuleStep = currentVs?.stepIndex ?? 0;

  return (
    <FormProvider {...methods}>
      <FormCard>
        <Box
          component="div"
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || event.shiftKey) return;
            const target = event.target as HTMLElement | null;
            const tagName = target?.tagName?.toLowerCase();
            if (tagName === 'textarea') return;

            event.preventDefault();
            if (!isLastStep) {
              void onNext();
              return;
            }
            void onSubmitClick();
          }}
        >
          <Box
            sx={{
              px: { xs: 2, sm: 3 },
              pt: { xs: 2.5, sm: 3 },
              pb: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: 'rgba(255,255,255,0.85)',
            }}
          >
            <Typography variant="h5" component="h1" gutterBottom sx={multilineI18nSx}>
              {getLabel(module.meta.title, 'it')}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: '52rem', ...multilineI18nSx }}
            >
              {getLabel(module.meta.description, 'it')}
            </Typography>
          </Box>

          <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2.5, pb: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                mb: 1,
                flexWrap: 'wrap',
              }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                {stepIndexLabel}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {Math.round(progress)}% completato
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={progress} sx={{ mb: 2 }} />
            <Stepper
              activeStep={activeModuleStep}
              sx={{
                mb: 0,
                overflowX: 'auto',
                pb: 0.5,
                '& .MuiStep-root': { minWidth: 'fit-content' },
              }}
            >
              {module.steps.map((s, i) => {
                const last = lastVirtualIndexForModuleStep(virtualSteps, i);
                return (
                  <Step key={s.id} completed={last >= 0 && currentVirtual > last}>
                    <StepLabel
                      sx={{
                        '& .MuiStepLabel-label': {
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          whiteSpace: 'pre-line',
                        },
                      }}
                    >
                      {getLabel(s.title, 'it')}
                    </StepLabel>
                  </Step>
                );
              })}
            </Stepper>
          </Box>

          <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
            <Typography
              variant="h6"
              component="h2"
              gutterBottom
              sx={{ mb: repeatSubtitle ? 0.5 : 2, ...multilineI18nSx }}
            >
              {stepTitle}
            </Typography>
            {repeatSubtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {repeatSubtitle}
              </Typography>
            )}

            {currentVs?.emptyRepeat && (
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {EMPTY_REPEAT_MESSAGE[currentVs.emptyRepeatReason ?? 'zero']}
              </Typography>
            )}

            {currentVs &&
              !currentVs.emptyRepeat &&
              visibleFields.map((field) => (
                <DynamicField
                  key={`${field.id}-${fieldFormKey(field.id, currentVs.step, currentVs.repeatIndex)}`}
                  field={field}
                  formKey={fieldFormKey(field.id, currentVs.step, currentVs.repeatIndex)}
                  step={currentVs.step}
                  repeatIndex={currentVs.repeatIndex}
                />
              ))}

            {submitError && (
              <Alert severity="error" sx={{ mt: 2 }} onClose={() => setSubmitError(null)}>
                {submitError}
              </Alert>
            )}
            {sanitizeNotice && (
              <Alert severity="info" sx={{ mt: 2 }} onClose={() => setSanitizeNotice(null)}>
                {sanitizeNotice}
              </Alert>
            )}
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2,
              flexWrap: 'wrap',
              px: { xs: 2, sm: 3 },
              py: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'rgba(60, 64, 67, 0.03)',
            }}
          >
            <Button
              type="button"
              disabled={currentVirtual === 0}
              onClick={onPrev}
              variant="outlined"
              color="inherit"
            >
              Indietro
            </Button>
            {!isLastStep ? (
              <Button type="button" variant="contained" onClick={() => void onNext()}>
                Avanti
              </Button>
            ) : (
              <Button type="button" variant="contained" onClick={() => void onSubmitClick()}>
                Invia
              </Button>
            )}
          </Box>
        </Box>
      </FormCard>
    </FormProvider>
  );
}
