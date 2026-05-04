import type React from "react";
import { Navigate } from "react-router-dom";

export const Index: React.FC = (props) => {
  return <Navigate to={"/dashboard"} />;
};
