import React, { useState } from 'react';

import { TopAppBar, TopAppBarNavigationIcon, TopAppBarRow, TopAppBarSection, TopAppBarTitle } from '@rmwc/top-app-bar';
import { Helmet } from 'react-helmet';
import { Drawer, DrawerTitle, DrawerSubtitle, DrawerHeader, DrawerContent } from '@rmwc/drawer';
import { IconButton } from '@rmwc/icon-button';
import { List, ListItem } from '@rmwc/list';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';

import style from './header.module.scss';
import { queueDialog } from 'components/builtin/actions';
import { Login, Register } from 'app/authModals';

const header = ({ login, register }) => {
  const [ drawerOpen, setDrawer ] = useState(false);
  const actionClick = action => () => setDrawer(false) || action();

  return (
    <>
    <TopAppBar fixed className={style.container}>
      <Helmet>
        <meta name='viewport' width='device-width, initial-scale=1, shrink-to-fit=no'/>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500" rel="stylesheet" />
        {/* <link href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:200" rel="stylesheet" /> */}
      </Helmet>
      <TopAppBarRow>
        <TopAppBarSection alignStart>
          <TopAppBarNavigationIcon icon='menu' onClick={() => setDrawer(!drawerOpen)}/>
          <TopAppBarTitle>Pathgrab</TopAppBarTitle>
        </TopAppBarSection>
        <TopAppBarSection alignEnd>
          <IconButton icon='account_circle' label='Login' onClick={login} />
        </TopAppBarSection>
      </TopAppBarRow>
      <Drawer modal open={drawerOpen} onClose={() => setDrawer(false)}>
        <DrawerHeader>
          <DrawerTitle>Pathgrab</DrawerTitle>
          <DrawerSubtitle>map</DrawerSubtitle>
        </DrawerHeader>
        <DrawerContent>
          <List>
            <div onClick={actionClick(login)}><ListItem>Login</ListItem></div>
            <div onClick={actionClick(register)}><ListItem>Register</ListItem></div>
            <Link to='/about'><ListItem>About</ListItem></Link>
          </List>
        </DrawerContent>
      </Drawer>
    </TopAppBar>
    <div style={{height: '64px'}} />
    </>
  )
}

const mapDispatchToProps = dispatch => ({
  login: () => dispatch(queueDialog(Login)),
  register: () => dispatch(queueDialog(Register))
})

export default connect(
  state => ({}),
  mapDispatchToProps
)(header);
