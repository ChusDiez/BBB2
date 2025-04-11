import classNames from 'classnames';
import { PropsWithChildren } from 'react';

type Props = PropsWithChildren<{
  innerClass: string;
}>;

export default function Card({ innerClass, children }: Props) {
  return (
    <div className={classNames({
      'bg-white shadow-sm rounded-3 p-4 d-flex': true,
      [innerClass]: true,
    })}
    >
      {children}
    </div>
  );
}
