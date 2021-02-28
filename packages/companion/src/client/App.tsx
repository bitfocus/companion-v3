import React from 'react';
import './App.scss';
import { Switch, BrowserRouter as Router, Route } from 'react-router-dom';
import { Form, Nav, Navbar, Button } from 'react-bootstrap';
import { LinkContainer, IndexLinkContainer } from 'react-router-bootstrap';
import SocketIOClient from 'socket.io-client';
import { AuthComponentWrapper } from './AuthWrapper';
import { TmpPage } from './TmpPage';

const socket = SocketIOClient.io();
socket.on('connect', () => {
	console.log('socket.io connected');
});
socket.on('disconnect', () => {
	console.log('socket.io disconnected');
});

(window as any).socket = socket; // TODO - temporary

class App extends React.Component {
	render(): React.ReactElement {
		return (
			<Router>
				<AuthComponentWrapper socket={socket}>
					<div>
						<Navbar bg='dark' variant='dark'>
							<LinkContainer to='/'>
								<Navbar.Brand>Companion3</Navbar.Brand>
							</LinkContainer>
							<Nav className='mr-auto'>
								<IndexLinkContainer to='/'>
									<Nav.Link>Home</Nav.Link>
								</IndexLinkContainer>
							</Nav>
							<Form inline>
								{/* {this.renderDeviceSelection()} */}

								<Button variant='outline-info'>Search</Button>
							</Form>
						</Navbar>

						<Switch>
							<Route exact path='/'>
								<TmpPage />
							</Route>
						</Switch>
					</div>
				</AuthComponentWrapper>
			</Router>
		);
	}
}
export default App;
