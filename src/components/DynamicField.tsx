'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import type { Field, Step, TripCapacity } from '@/types/module';
import { isTripOptionExhausted, type TripCapacitySnapshot } from '@/lib/enrollment-capacity';
import { getLabel, multilineI18nSx } from '@/lib/i18n';
import { evaluateCondition } from '@/lib/conditions';
import { makeConditionGetValue } from '@/lib/repeat-steps';
import {
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Radio,
  RadioGroup,
  Checkbox,
  Box,
  Alert,
  Typography,
} from '@mui/material';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import {
  SELECT_OTHER_TEXT_MAX_LEN,
  selectOtherSentinel,
  selectOtherTextKey,
} from '@/lib/select-other';

const LOCALE = 'it';
/** Vicino alle opzioni con `enabled: false` (capienza esaurita nello schema). */
const CAPACITY_EXHAUSTED_LABEL = 'Posti esauriti';
const DISABLED_OPTION_GENERIC_SUFFIX = ' (non disponibile)';

function capacityExhaustedOptionLabel(baseLabel: string) {
  return (
    <Box sx={{ py: 0.25, maxWidth: '100%' }}>
      <Typography
        component="span"
        variant="caption"
        color="error"
        sx={{ fontWeight: 700, display: 'block', mb: 0.25, ...multilineI18nSx }}
      >
        {CAPACITY_EXHAUSTED_LABEL}
      </Typography>
      <Typography
        component="span"
        variant="body2"
        color="error.main"
        sx={{ ...multilineI18nSx }}
      >
        {baseLabel}
      </Typography>
    </Box>
  );
}

export interface DynamicFieldProps {
  field: Field;
  /** Chiave in `responses` / form state (`id` o `id_0`, …) */
  formKey: string;
  step: Step;
  /** `null` se step non ripetuto */
  repeatIndex: number | null;
  /** Modifica iscrizione: opzioni `enabled:false` già selezionate restano modificabili. */
  submissionEditMode?: boolean;
  /** Snapshot gite (POST); con `tripCapacity` abilita disabilitazione e etichetta «Posti esauriti». */
  tripCapacity?: TripCapacity;
  tripSnapshot?: TripCapacitySnapshot | null;
}

function RequiredMark() {
  return (
    <Box
      component="span"
      sx={{ color: 'error.main', ml: 0.25 }}
      aria-hidden
    >
      *
    </Box>
  );
}

function isOptionSelectableInField(
  opt: NonNullable<Field['options']>[number],
  getValue: (fieldId: string) => unknown,
  submissionEditMode: boolean,
  isCurrentlySelected: boolean,
  tripPlacesExhausted: boolean
): boolean {
  if (opt.enabledIf && !evaluateCondition(opt.enabledIf, getValue)) return false;
  if (opt.enabled === false && !(submissionEditMode && isCurrentlySelected)) return false;
  if (tripPlacesExhausted && !(submissionEditMode && isCurrentlySelected)) return false;
  return true;
}

function fieldError(
  errors: Record<string, unknown>,
  formKey: string
): { message?: string } | undefined {
  const e = errors[formKey];
  if (e && typeof e === 'object' && 'message' in e) {
    return e as { message?: string };
  }
  return undefined;
}

export function DynamicField({
  field,
  formKey,
  step,
  repeatIndex,
  submissionEditMode = false,
  tripCapacity,
  tripSnapshot = null,
}: DynamicFieldProps) {
  const {
    control,
    formState: { errors },
    getValues,
    setValue,
  } = useFormContext();
  const watched = useWatch({ control });
  const values = useMemo(
    () => getValues() as Record<string, unknown>,
    [watched, getValues]
  );
  const getValue = makeConditionGetValue(values, step, repeatIndex);
  const isRequired =
    field.required ||
    (!!field.requiredIf && evaluateCondition(field.requiredIf, getValue));

  /** Capienza gite (snapshot): per ogni `option.value` se i posti confermati sono esauriti. */
  const tripExhaustedByOption = useMemo(() => {
    const map = new Map<string, boolean>();
    if (
      !tripCapacity?.enabled ||
      !tripSnapshot?.enabled ||
      !tripCapacity.limitsByField?.[field.id]
    ) {
      return map;
    }
    for (const opt of field.options ?? []) {
      map.set(
        opt.value,
        isTripOptionExhausted(
          tripCapacity,
          tripSnapshot,
          values,
          field.id,
          opt.value,
          repeatIndex
        )
      );
    }
    return map;
  }, [field.id, field.options, repeatIndex, tripCapacity, tripSnapshot, values]);

  const hasTripExhaustedOptionOnField = useMemo(() => {
    for (const opt of field.options ?? []) {
      if (tripExhaustedByOption.get(opt.value)) return true;
    }
    return false;
  }, [field.options, tripExhaustedByOption]);

  const label = getLabel(field.label, LOCALE);
  const placeholder = getLabel(field.placeholder, LOCALE);
  const errObj = fieldError(errors as Record<string, unknown>, formKey);
  const errMsg = errObj?.message as string | undefined;
  const enabledOptionValues = useMemo(() => {
    if (
      field.type !== 'radio' &&
      field.type !== 'checkbox-group' &&
      field.type !== 'select'
    ) {
      return null;
    }
    const opts = field.options ?? [];
    const selectionForOpt = (optValue: string) =>
      field.type === 'checkbox-group'
        ? Array.isArray(values[formKey]) &&
          (values[formKey] as string[]).includes(optValue)
        : typeof values[formKey] === 'string' && values[formKey] === optValue;

    const base = opts
      .filter((opt) => {
        const tripFull = tripExhaustedByOption.get(opt.value) ?? false;
        return isOptionSelectableInField(
          opt,
          getValue,
          submissionEditMode,
          selectionForOpt(opt.value),
          tripFull
        );
      })
      .map((opt) => opt.value);
    if (field.type === 'select') {
      const ov = selectOtherSentinel(field);
      if (ov) return [...base, ov];
    }
    return base;
  }, [field, formKey, getValue, submissionEditMode, tripExhaustedByOption, values]);

  useEffect(() => {
    if ((field.type !== 'radio' && field.type !== 'select') || !enabledOptionValues) return;
    const current = values[formKey];
    if (typeof current !== 'string' || current === '') return;
    if (!enabledOptionValues.includes(current)) {
      setValue(formKey, '', { shouldDirty: true, shouldValidate: true });
    }
  }, [enabledOptionValues, field.type, formKey, setValue, values]);

  useEffect(() => {
    if (field.type !== 'checkbox-group' || !enabledOptionValues) return;
    const current = values[formKey];
    const selected = Array.isArray(current) ? current.filter((v): v is string => typeof v === 'string') : [];
    if (selected.length === 0) return;
    const cleaned = selected.filter((v) => enabledOptionValues.includes(v));
    if (cleaned.length !== selected.length) {
      setValue(formKey, cleaned, { shouldDirty: true, shouldValidate: true });
    }
  }, [enabledOptionValues, field.type, formKey, setValue, values]);

  const common = {
    label,
    placeholder: placeholder || undefined,
    error: !!errMsg,
    helperText: errMsg,
    required: isRequired,
    InputLabelProps: { sx: multilineI18nSx },
  };

  const labelId = `${formKey.replace(/[^a-zA-Z0-9_-]/g, '_')}-label`;

  switch (field.type) {
    case 'notice':
      return (
        <Alert
          severity={field.noticeVariant ?? 'info'}
          sx={{
            mt: 1,
            mb: 0.5,
            whiteSpace: 'pre-wrap',
            '& .MuiAlert-message': { width: '100%', ...multilineI18nSx },
          }}
        >
          {getLabel(field.noticeText ?? field.label, LOCALE)}
        </Alert>
      );

    case 'text':
    case 'email':
      return (
        <Controller
          name={formKey}
          control={control}
          defaultValue=""
          render={({ field: f }) => {
            const isCodiceFiscale = field.validation === 'codice_fiscale';
            return (
              <TextField
                {...f}
                {...common}
                fullWidth
                margin="normal"
                type={field.type === 'email' ? 'email' : 'text'}
                onChange={(e) => {
                  const raw = e.target.value;
                  f.onChange(isCodiceFiscale ? raw.replace(/\s+/g, '') : raw);
                }}
              />
            );
          }}
        />
      );

    case 'number': {
      const inputProps: { min?: number; max?: number; step?: string } = {};
      if (field.min !== undefined) inputProps.min = field.min;
      if (field.max !== undefined) inputProps.max = field.max;
      inputProps.step = 'any';
      return (
        <Controller
          name={formKey}
          control={control}
          defaultValue=""
          render={({ field: f }) => (
            <TextField
              {...f}
              {...common}
              fullWidth
              margin="normal"
              type="number"
              inputProps={inputProps}
              value={f.value === undefined || f.value === null ? '' : f.value}
              onChange={(e) => {
                const v = e.target.value;
                f.onChange(v === '' ? undefined : Number(v));
              }}
            />
          )}
        />
      );
    }

    case 'textarea':
      return (
        <Controller
          name={formKey}
          control={control}
          defaultValue=""
          render={({ field: f }) => (
            <TextField
              {...f}
              {...common}
              fullWidth
              margin="normal"
              multiline
              minRows={2}
            />
          )}
        />
      );

    case 'date':
      return (
        <Controller
          name={formKey}
          control={control}
          defaultValue=""
          render={({ field: f }) => (
            <TextField
              {...f}
              {...common}
              fullWidth
              margin="normal"
              type="date"
              InputLabelProps={{ shrink: true, sx: multilineI18nSx }}
              value={f.value ?? ''}
            />
          )}
        />
      );

    case 'select': {
      const otherVal = selectOtherSentinel(field);
      const otherKey = selectOtherTextKey(formKey);
      const otherErr = fieldError(errors as Record<string, unknown>, otherKey)?.message as
        | string
        | undefined;
      const otherMenuLabel = getLabel(field.selectOther?.label ?? { it: 'Altro' }, LOCALE);
      const otherPlaceholder = field.selectOther?.placeholder?.it
        ? getLabel(field.selectOther.placeholder, LOCALE)
        : undefined;
      const hasSchemaCapacityOptions = (field.options ?? []).some((opt) => opt.enabled === false);
      const showCapacityHelper = hasSchemaCapacityOptions || hasTripExhaustedOptionOnField;
      return (
        <>
          <Controller
            name={formKey}
            control={control}
            defaultValue=""
            render={({ field: f }) => (
              <FormControl fullWidth margin="normal" error={!!errMsg} required={isRequired}>
                <InputLabel id={labelId} sx={multilineI18nSx}>
                  {label}
                </InputLabel>
                <Select
                  {...f}
                  labelId={labelId}
                  label={label}
                  value={f.value ?? ''}
                  onChange={(e) => {
                    const v = e.target.value as string;
                    f.onChange(v);
                    if (otherVal && v !== otherVal) {
                      setValue(otherKey, '', { shouldDirty: true, shouldValidate: true });
                    }
                  }}
                  displayEmpty
                  inputProps={{ 'aria-invalid': !!errMsg }}
                >
                  {field.options?.map((opt) => {
                    const tripFull = tripExhaustedByOption.get(opt.value) ?? false;
                    const isEnabled = isOptionSelectableInField(
                      opt,
                      getValue,
                      submissionEditMode,
                      (f.value as string | undefined) === opt.value,
                      tripFull
                    );
                    const baseLabel = getLabel(opt.label, LOCALE);
                    const showPostiEsauritiBlock = opt.enabled === false || tripFull;
                    return (
                      <MenuItem
                        key={opt.value}
                        value={opt.value}
                        disabled={!isEnabled}
                        sx={{
                          ...multilineI18nSx,
                          alignItems: 'flex-start',
                          py: isEnabled ? undefined : 1,
                          '&.Mui-disabled': { opacity: 1 },
                        }}
                      >
                        {isEnabled ? (
                          baseLabel
                        ) : showPostiEsauritiBlock ? (
                          capacityExhaustedOptionLabel(baseLabel)
                        ) : (
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                            sx={multilineI18nSx}
                          >
                            {`${baseLabel}${DISABLED_OPTION_GENERIC_SUFFIX}`}
                          </Typography>
                        )}
                      </MenuItem>
                    );
                  })}
                  {otherVal && (
                    <MenuItem value={otherVal} sx={multilineI18nSx}>
                      {otherMenuLabel}
                    </MenuItem>
                  )}
                </Select>
                {errMsg && <FormHelperText>{errMsg}</FormHelperText>}
                {!errMsg && showCapacityHelper && (
                  <FormHelperText component="div">
                    Alcune opzioni non sono selezionabili: sono indicate con{' '}
                    <Box component="span" sx={{ fontWeight: 700, color: 'error.main' }}>
                      {CAPACITY_EXHAUSTED_LABEL}
                    </Box>{' '}
                    quando i posti sono esauriti.
                  </FormHelperText>
                )}
              </FormControl>
            )}
          />
          {otherVal && (
            <Controller
              name={otherKey}
              control={control}
              defaultValue=""
              render={({ field: f }) => {
                const main = values[formKey];
                const show = typeof main === 'string' && main === otherVal;
                return (
                  <TextField
                    {...f}
                    fullWidth
                    margin="normal"
                    label={`${otherMenuLabel} — specificare`}
                    placeholder={otherPlaceholder}
                    value={f.value ?? ''}
                    error={!!otherErr}
                    helperText={otherErr}
                    required={show}
                    sx={{ display: show ? undefined : 'none' }}
                    inputProps={{
                      maxLength: SELECT_OTHER_TEXT_MAX_LEN,
                      'aria-invalid': !!otherErr,
                    }}
                    InputLabelProps={{ sx: multilineI18nSx }}
                  />
                );
              }}
            />
          )}
        </>
      );
    }

    case 'radio': {
      const stackCapacityOptions =
        (field.options ?? []).some((opt) => opt.enabled === false) ||
        hasTripExhaustedOptionOnField;
      return (
        <Controller
          name={formKey}
          control={control}
          defaultValue=""
          render={({ field: f }) => (
            <FormControl
              component="fieldset"
              margin="normal"
              error={!!errMsg}
              required={isRequired}
            >
              <FormLabel component="legend" sx={multilineI18nSx}>
                {label}
              </FormLabel>
              <RadioGroup
                sx={{
                  flexDirection: stackCapacityOptions ? 'column' : 'row',
                  alignItems: 'flex-start',
                  gap: stackCapacityOptions ? 1 : undefined,
                  flexWrap: 'wrap',
                }}
                row={!stackCapacityOptions}
                value={f.value ?? ''}
                onChange={(_, v) => f.onChange(v)}
              >
                {field.options?.map((opt) => {
                  const tripFull = tripExhaustedByOption.get(opt.value) ?? false;
                  const isEnabled = isOptionSelectableInField(
                    opt,
                    getValue,
                    submissionEditMode,
                    (f.value as string | undefined) === opt.value,
                    tripFull
                  );
                  const baseLabel = getLabel(opt.label, LOCALE);
                  const showPostiEsauritiBlock = opt.enabled === false || tripFull;
                  let labelNode: ReactNode = baseLabel;
                  if (!isEnabled && showPostiEsauritiBlock) {
                    labelNode = capacityExhaustedOptionLabel(baseLabel);
                  } else if (!isEnabled) {
                    labelNode = `${baseLabel}${DISABLED_OPTION_GENERIC_SUFFIX}`;
                  }
                  return (
                    <FormControlLabel
                      key={opt.value}
                      value={opt.value}
                      control={<Radio />}
                      label={labelNode}
                      disabled={!isEnabled}
                      sx={{
                        alignItems: 'flex-start',
                        m: stackCapacityOptions ? 0 : undefined,
                        '& .MuiFormControlLabel-label': {
                          ...multilineI18nSx,
                          pt:
                            stackCapacityOptions && !isEnabled && showPostiEsauritiBlock ? 0 : 0.5,
                        },
                        '& .MuiFormControlLabel-label.Mui-disabled': {
                          color: 'text.secondary',
                          opacity: 1,
                        },
                      }}
                    />
                  );
                })}
              </RadioGroup>
              {errMsg && <FormHelperText>{errMsg}</FormHelperText>}
              {!errMsg && stackCapacityOptions && (
                <FormHelperText component="div">
                  Alcune opzioni non sono selezionabili: sono indicate con{' '}
                  <Box component="span" sx={{ fontWeight: 700, color: 'error.main' }}>
                    {CAPACITY_EXHAUSTED_LABEL}
                  </Box>{' '}
                  quando i posti sono esauriti.
                </FormHelperText>
              )}
            </FormControl>
          )}
        />
      );
    }

    case 'checkbox':
      return (
        <Controller
          name={formKey}
          control={control}
          defaultValue={false}
          render={({ field: f }) => (
            <FormControl margin="normal" error={!!errMsg}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!f.value}
                    onChange={(e) => f.onChange(e.target.checked)}
                  />
                }
                label={
                  <>
                    {label}
                    {isRequired && <RequiredMark />}
                  </>
                }
                sx={{ '& .MuiFormControlLabel-label': multilineI18nSx }}
              />
              {errMsg && <FormHelperText>{errMsg}</FormHelperText>}
            </FormControl>
          )}
        />
      );

    case 'checkbox-group': {
      const showTripOrSchemaCapacity =
        (field.options ?? []).some((opt) => opt.enabled === false) ||
        hasTripExhaustedOptionOnField;
      return (
        <Controller
          name={formKey}
          control={control}
          defaultValue={[]}
          render={({ field: f }) => {
            const selected = Array.isArray(f.value) ? (f.value as string[]) : [];
            return (
              <FormControl margin="normal" error={!!errMsg} required={isRequired}>
                <FormLabel
                  component="legend"
                  sx={{ mb: 1, fontWeight: 500, ...multilineI18nSx }}
                >
                  {label}
                </FormLabel>
                {field.options?.map((opt) => {
                  const isChecked = selected.includes(opt.value);
                  const tripFull = tripExhaustedByOption.get(opt.value) ?? false;
                  const isEnabled = isOptionSelectableInField(
                    opt,
                    getValue,
                    submissionEditMode,
                    isChecked,
                    tripFull
                  );
                  const optLabel = getLabel(opt.label, LOCALE);
                  const showPostiEsauritiBlock = opt.enabled === false || tripFull;
                  let labelNode: ReactNode = optLabel;
                  if (!isEnabled && showPostiEsauritiBlock) {
                    labelNode = capacityExhaustedOptionLabel(optLabel);
                  } else if (!isEnabled) {
                    labelNode = `${optLabel}${DISABLED_OPTION_GENERIC_SUFFIX}`;
                  }
                  return (
                    <FormControlLabel
                      key={opt.value}
                      control={
                        <Checkbox
                          checked={isChecked}
                          disabled={!isEnabled}
                          onChange={(e) => {
                            if (!isEnabled) return;
                            if (e.target.checked) {
                              f.onChange([...selected, opt.value]);
                            } else {
                              f.onChange(selected.filter((v) => v !== opt.value));
                            }
                          }}
                        />
                      }
                      label={labelNode}
                      disabled={!isEnabled}
                      sx={{
                        alignItems: 'flex-start',
                        mb: showTripOrSchemaCapacity && !isEnabled && showPostiEsauritiBlock ? 0.5 : 0,
                        '& .MuiFormControlLabel-label': multilineI18nSx,
                        '& .MuiFormControlLabel-label.Mui-disabled': {
                          color: 'text.secondary',
                          opacity: 1,
                        },
                      }}
                    />
                  );
                })}
                {errMsg && <FormHelperText>{errMsg}</FormHelperText>}
                {!errMsg && showTripOrSchemaCapacity && (
                  <FormHelperText component="div">
                    Alcune opzioni non sono selezionabili: sono indicate con{' '}
                    <Box component="span" sx={{ fontWeight: 700, color: 'error.main' }}>
                      {CAPACITY_EXHAUSTED_LABEL}
                    </Box>{' '}
                    quando i posti sono esauriti.
                  </FormHelperText>
                )}
              </FormControl>
            );
          }}
        />
      );
    }

    case 'switch':
      return (
        <Controller
          name={formKey}
          control={control}
          defaultValue={false}
          render={({ field: f }) => (
            <FormControl margin="normal" error={!!errMsg}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  '& .MuiFormControlLabel-label': { display: 'flex', alignItems: 'center' },
                }}
              >
                <Switch
                  checked={!!f.value}
                  onChange={(e) => f.onChange(e.target.checked)}
                />
                <Box
                  component="span"
                  sx={{ typography: 'body1', ...multilineI18nSx }}
                >
                  {label}
                  {isRequired && <RequiredMark />}
                </Box>
              </Box>
              {errMsg && <FormHelperText>{errMsg}</FormHelperText>}
            </FormControl>
          )}
        />
      );

    default:
      return (
        <Controller
          name={formKey}
          control={control}
          defaultValue=""
          render={({ field: f }) => (
            <TextField {...f} {...common} fullWidth margin="normal" />
          )}
        />
      );
  }
}
