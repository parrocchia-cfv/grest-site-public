'use client';

import { useEffect, useMemo } from 'react';
import type { Field, Step } from '@/types/module';
import { getLabel } from '@/lib/i18n';
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
} from '@mui/material';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

const LOCALE = 'it';

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
    if (field.type !== 'radio' && field.type !== 'checkbox-group') return null;
    const opts = field.options ?? [];
    return opts
      .filter((opt) => !opt.enabledIf || evaluateCondition(opt.enabledIf, getValue))
      .map((opt) => opt.value);
  }, [field, getValue]);

  useEffect(() => {
    if (field.type !== 'radio' || !enabledOptionValues) return;
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
  };

  const labelId = `${formKey.replace(/[^a-zA-Z0-9_-]/g, '_')}-label`;

  switch (field.type) {
    case 'text':
    case 'email':
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
              type={field.type === 'email' ? 'email' : 'text'}
            />
          )}
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
              InputLabelProps={{ shrink: true }}
              value={f.value ?? ''}
            />
          )}
        />
      );

    case 'select':
      return (
        <Controller
          name={formKey}
          control={control}
          defaultValue=""
          render={({ field: f }) => (
            <FormControl fullWidth margin="normal" error={!!errMsg} required={isRequired}>
              <InputLabel id={labelId}>{label}</InputLabel>
              <Select
                {...f}
                labelId={labelId}
                label={label}
                value={f.value ?? ''}
                onChange={(e) => f.onChange(e.target.value)}
              >
                {field.options?.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {getLabel(opt.label, LOCALE)}
                  </MenuItem>
                ))}
              </Select>
              {errMsg && <FormHelperText>{errMsg}</FormHelperText>}
            </FormControl>
          )}
        />
      );

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
              <FormLabel component="legend">{label}</FormLabel>
              <RadioGroup
                row
                value={f.value ?? ''}
                onChange={(_, v) => f.onChange(v)}
              >
                {field.options?.map((opt) => {
                  const isEnabled =
                    !opt.enabledIf || evaluateCondition(opt.enabledIf, getValue);
                  return (
                    <FormControlLabel
                      key={opt.value}
                      value={opt.value}
                      control={<Radio />}
                      label={getLabel(opt.label, LOCALE)}
                      disabled={!isEnabled}
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
                <FormLabel component="legend" sx={{ mb: 1, fontWeight: 500 }}>
                  {label}
                </FormLabel>
                {field.options?.map((opt) => {
                  const optLabel = getLabel(opt.label, LOCALE);
                  const isChecked = selected.includes(opt.value);
                  const isEnabled =
                    !opt.enabledIf || evaluateCondition(opt.enabledIf, getValue);
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
                      label={optLabel}
                      disabled={!isEnabled}
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
                <Box component="span" sx={{ typography: 'body1' }}>
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
