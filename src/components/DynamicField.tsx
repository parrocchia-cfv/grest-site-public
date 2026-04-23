'use client';

import { useEffect, useMemo } from 'react';
import type { Field, Step } from '@/types/module';
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
const DISABLED_OPTION_CAPACITY_PREFIX = 'POSTI ESAURITI';
const DISABLED_OPTION_GENERIC_SUFFIX = ' (non disponibile)';

export interface DynamicFieldProps {
  field: Field;
  /** Chiave in `responses` / form state (`id` o `id_0`, …) */
  formKey: string;
  step: Step;
  /** `null` se step non ripetuto */
  repeatIndex: number | null;
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
    const base = opts
      .filter(
        (opt) =>
          opt.enabled !== false &&
          (!opt.enabledIf || evaluateCondition(opt.enabledIf, getValue))
      )
      .map((opt) => opt.value);
    if (field.type === 'select') {
      const ov = selectOtherSentinel(field);
      if (ov) return [...base, ov];
    }
    return base;
  }, [field, getValue]);

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
      const hasHardDisabledOptions = (field.options ?? []).some((opt) => opt.enabled === false);
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
                    const isEnabled =
                      opt.enabled !== false &&
                      (!opt.enabledIf || evaluateCondition(opt.enabledIf, getValue));
                    const baseLabel = getLabel(opt.label, LOCALE);
                    const reasonPrefix =
                      opt.enabled === false
                        ? DISABLED_OPTION_CAPACITY_PREFIX
                        : '';
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
                        ) : (
                          <Box>
                            {reasonPrefix ? (
                              <Typography
                                component="span"
                                variant="caption"
                                color="error.main"
                                sx={{ fontWeight: 700, display: 'block', ...multilineI18nSx }}
                              >
                                {reasonPrefix}
                              </Typography>
                            ) : null}
                            <Typography
                              component="span"
                              variant="body2"
                              sx={{
                                color: reasonPrefix ? 'error.main' : 'text.secondary',
                                ...multilineI18nSx,
                              }}
                            >
                              {reasonPrefix ? baseLabel : `${baseLabel}${DISABLED_OPTION_GENERIC_SUFFIX}`}
                            </Typography>
                          </Box>
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
                {!errMsg && hasHardDisabledOptions && (
                  <FormHelperText>
                    Alcune sedi sono complete: voci marcate <strong>{DISABLED_OPTION_CAPACITY_PREFIX}</strong>.
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

    case 'radio':
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
                row
                value={f.value ?? ''}
                onChange={(_, v) => f.onChange(v)}
              >
                {field.options?.map((opt) => {
                  const isEnabled =
                    opt.enabled !== false &&
                    (!opt.enabledIf || evaluateCondition(opt.enabledIf, getValue));
                  const baseLabel = getLabel(opt.label, LOCALE);
                  return (
                    <FormControlLabel
                      key={opt.value}
                      value={opt.value}
                      control={<Radio />}
                      label={
                        isEnabled ? baseLabel : `${baseLabel}${DISABLED_OPTION_GENERIC_SUFFIX}`
                      }
                      disabled={!isEnabled}
                      sx={{
                        '& .MuiFormControlLabel-label': multilineI18nSx,
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
            </FormControl>
          )}
        />
      );

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

    case 'checkbox-group':
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
                  const isEnabled =
                    opt.enabled !== false &&
                    (!opt.enabledIf || evaluateCondition(opt.enabledIf, getValue));
                  const optLabel = getLabel(opt.label, LOCALE);
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
                      label={
                        isEnabled ? optLabel : `${optLabel}${DISABLED_OPTION_GENERIC_SUFFIX}`
                      }
                      disabled={!isEnabled}
                      sx={{
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
              </FormControl>
            );
          }}
        />
      );

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
