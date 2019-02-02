import React from 'react';
import {DialogTitle, DialogContent, DialogActions, DialogButton } from '@rmwc/dialog';
import { queueDialog, queueSnack } from '../components/builtin/actions';
import withValidation from '@omarzion/validation';
import { Validate } from '../utils';
import ValidatedTextField from 'components/ValidatedTextField';
import * as Api from '../apiActions';



export const Login = withValidation()(({ close, dispatch, controller }) => {
  const register = () => {  close(); dispatch(queueDialog(Register)); };
  const login = async () => {
    if (await controller.validate()) {
      const data = controller.getValues();
      let result = await Api.login({ email: data.Email, password: data.Password });
      if (result.error) {
        dispatch(queueSnack({ message: 'Email and password don\'t match' }));
      } else {
        close();
      }
    }
  }
  return (
    <>
      <DialogTitle>Login</DialogTitle>
      <DialogContent>
        <ValidatedTextField controller={controller}  label='Email' validate={Validate.Length(3)} />
        <ValidatedTextField controller={controller} label='Password' type='password' validate={Validate.Password()} />
      </DialogContent>
      <DialogActions>
        <DialogButton onClick={register}>Register</DialogButton>
        <DialogButton isDefaultAction onClick={login}>Login</DialogButton>
      </DialogActions>
    </>
  )
})

export const Register = withValidation()(({ close, dispatch, controller }) => {
  const login = () => { dispatch(queueDialog(Login)); close(); };
  const register = async () => {
    // console.log(controller.getValues());
    if (await controller.validate()) {
      const data = controller.getValues();
      console.log(data);
      const user = {
        name: data.Name,
        username: data.Username,
        email: data.Email,
        password: data.Password
      }
      let result = await Api.register(user);
      if (result.error) {
        // dispatch(pushDialog())
      } else {
        
      }
      console.log(result);
    }
  }
  return (
    <>
      <DialogTitle>Register</DialogTitle>
      <DialogContent>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <ValidatedTextField label="Name" controller={controller} validate={v => true}/>
          <ValidatedTextField label='Username' controller={controller} validate={Validate.Username}/>
          <ValidatedTextField label='Email' controller={controller} validate={Validate.Email}/>
          <ValidatedTextField type='password' label='Password' controller={controller} validate={Validate.Password()}/>
          <ValidatedTextField type='password' label='Repeat Password' controller={controller} validate={Validate.Match('Password')}/>
        </div>
      </DialogContent>
      <DialogActions>
        <DialogButton onClick={login}>Login</DialogButton>
        <DialogButton onClick={register} isDefaultAction>Register</DialogButton>
      </DialogActions>
    </>
  );
})



