import React from 'react';

import io from 'socket.io-client';

const SocketContext = React.createContext<SocketIOClient.Socket>(io({ autoConnect: false }));

export default SocketContext;
