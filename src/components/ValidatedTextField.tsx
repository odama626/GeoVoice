import React from 'react';
import { Wrapper } from '@omarzion/validation';
import { TextField, TextFieldHelperText } from '@rmwc/textfield';

export default ({ controller, label, validate, ...rest }) => (
  <Wrapper controller={controller} name={label} validate={validate}>
    {({ error, message, onChange, value }) => (
      <>
        <TextField label={label} value={value} {...rest} onChange={e => onChange(e.target.value)} invalid={error}/>
        <TextFieldHelperText validationMsg>{message}</TextFieldHelperText>
      </>
    )}
  </Wrapper>
)
