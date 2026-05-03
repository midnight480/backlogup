import React, { ReactNode } from "react";
import type * as backlog from "backlog-js";

interface Props {
  user: backlog.Entity.User.User;
  children?: ReactNode;
}

export const UserHeader: React.FC<Props> = (props: Props) => {
  return (
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <img
          alt={props.user?.name || "User Avatar"}
          src={`/assets/users/${props.user?.id}/icon`}
          className="h-10 w-10 rounded-full"
        />
      </div>
      <div className="ml-3">
        <div>
          <span className="text-sm font-bold text-gray-900">{props.user?.name}</span>
        </div>
        {props.children}
      </div>
    </div>
  );
};
