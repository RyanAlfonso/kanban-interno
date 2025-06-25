"use client";

import { FC, useMemo } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "../app/quill.css";

type CustomizedReactQuillProps = {
  theme: string;
  value?: string;
  onChange: (value: string) => void;
  className?: string;
};

const CustomizedReactQuill: FC<CustomizedReactQuillProps> = ({
  theme,
  value = "",
  onChange,
  className,
}) => {
  const Toolbar = useMemo(() => {
    return (
      <div id="toolbar">
        <select
          className="ql-header"
          defaultValue={""}
          onChange={(e) => e.persist()}
        ></select>
        <span className="ql-formats">
          <button className="ql-bold" />
          <button className="ql-italic" />
          <button className="ql-underline" />
          <button className="ql-link" />
        </span>
        <span className="ql-formats">
          <button className="ql-list" value="ordered" />
          <button className="ql-list" value="bullet" />
        </span>
      </div>
    );
  }, []);

  return (
    <>
      {Toolbar}
      <ReactQuill
        theme={theme}
        value={value}
        onChange={onChange}
        modules={{ toolbar: "#toolbar" }}
        className={className}
      />
    </>
  );
};

export default CustomizedReactQuill;
