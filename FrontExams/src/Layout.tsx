import { ReactNode } from 'react';
import NavBar from './components/NavBar';
import SideBar from './components/SideBar';

type Props = {
  children: ReactNode
};
export default function Layout({ children }: Props) {
  return (
    <div className="h-100">
      <div className="d-flex h-100">
        <div className="bg-white">
          <SideBar />
        </div>
        <div className="flex-1 d-flex flex-column">
          <NavBar />
          <div className="py-1 p-lg-5 overflow-scroll h-100">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
