import type * as backlog from "backlog-js";
import type React from "react";
import type { ReactNode } from "react";

interface Props {
  user: backlog.Entity.User.User;
  alreadyRead: boolean;
  children?: ReactNode;
}

export const NotificationUser: React.FC<Props> = (props: Props) => {
  return (
    <div className="ml-1 relative inline-block" title={props.user?.name}>
      <img
        alt={props.user?.name || "Notification User"}
        src={`/assets/users/${props.user?.id}/icon`}
        className={`h-6 w-6 rounded-full ${!props.alreadyRead ? "opacity-100" : "opacity-60"}`}
      />
      {!props.alreadyRead && <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-500 ring-2 ring-white"></span>}
    </div>
  );
};
