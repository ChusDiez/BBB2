import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import {
  RouterProvider,
} from 'react-router-dom';

import './styles/base.scss';
import './styles/home.scss';
import './styles/historic.scss';
import './styles/admin.scss';
import './styles/generator.scss';

import reportWebVitals from './reportWebVitals';
import store from './store/store';
import router from './router';
import QuestionModal from './components/QuestionModal';
import { ModalContextProvider } from './context/ModalContext';

const root = ReactDOM.createRoot(document.getElementById('frontGenerator') as Element);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <ModalContextProvider
        portalName="modal"
        availableModals={{
          addQuestion: QuestionModal,
        }}
      >
        <RouterProvider router={router} />
      </ModalContextProvider>
    </Provider>
  </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
