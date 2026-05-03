import "sanitize.css";
import "dayjs/locale/ja";

import dayjs from "dayjs";
import { configure } from "mobx";
import { observer } from "mobx-react-lite";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { style } from "typestyle";
import CssBaseline from "@mui/material/CssBaseline";
import { Index } from "./containers";
import { Issues } from "./containers/issues";
import { Issue } from "./containers/issue";
import { Wiki } from "./containers/wiki";
import { Document } from "./containers/document";

dayjs.locale("ja");
configure({
  enforceActions: "never",
});

const styles = {
  root: style({
    minHeight: "100vh",
    $nest: {
      "a": {
        color: "#00836b",
      },
      "code:not([class])": {
        backgroundColor: "#f5f5f5",
        border: "1px solid #e4e4e4",
        borderRadius: 2,
        padding: 2,
      },
      "img": {
        maxWidth: "100%",
      },
      ".MuiDataGrid-overlayWrapperInner": {
        position: "fixed",
      },
      ".markdown-body": {
        $nest: {
          "blockquote": {
            borderLeft: "4px solid #cccccc",
            marginLeft: 0,
            paddingLeft: 10,
            color: "#666666",
          },
        },
      },
    },
  }),
};

// rome-ignore lint/style/noNonNullAssertion: <explanation>
createRoot(document.querySelector("#app")!).render(
  <div className={styles.root}>
    <CssBaseline />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/issues" element={<Issues />} />
        <Route path="/issues/:id" element={<Issue />} />
        <Route path="/wikis/:id" element={<Wiki />} />
        <Route path="/documents/:id" element={<Document />} />
      </Routes>
    </BrowserRouter>
  </div>
);
