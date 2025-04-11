import { Outlet, createBrowserRouter } from 'react-router-dom';
import App from './App';
import Topic from './routes/generator/Topic';
import Block from './routes/generator/Block';
import Multiple from './routes/generator/Multiple';
import Admin from './routes/Admin';
import Historic from './routes/Historic';
import Upload from './routes/Upload';
import Layout from './Layout';
import Result from './routes/Result';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout><App /></Layout>,
  },
  {
    path: '/generator',
    element: <Layout><Outlet /></Layout>,
    children: [
      {
        path: 'topic',
        index: true,
        element: <Topic />,
      },
      {
        path: 'multiple',
        element: <Multiple />,
      },
      {
        path: 'block',
        element: <Block />,
      },
    ],
  },
  {
    path: '/admin',
    element: <Layout><Admin /></Layout>,
  },
  {
    path: '/upload',
    element: <Layout><Upload /></Layout>,
  },
  {
    path: '/historic',
    element: <Layout><Historic /></Layout>,
  },
  {
    path: '/result',
    element: <Layout><Result /></Layout>,
  },
]);

export default router;
