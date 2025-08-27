"use client";

import { FC, useMemo } from "react";
import ReactQuill, { ReactQuillProps } from "react-quill";

import "react-quill/dist/quill.snow.css";
import "../app/quill.css";

type CustomizedReactQuillProps = ReactQuillProps & {
  className?: string;
};

const CustomizedReactQuill: FC<CustomizedReactQuillProps> = ({
  className,
  ...props
}) => {
  const toolbarContent = useMemo(
    () => (
      <div id="toolbar">
        <span className="ql-formats">
          <select className="ql-header" defaultValue="">
            <option value="1">Título 1</option>
            <option value="2">Título 2</option>
            <option value="">Normal</option>
          </select>
        </span>
        <span className="ql-formats">
          <button className="ql-bold" />
          <button className="ql-italic" />
          <button className="ql-underline" />
        </span>
        <span className="ql-formats">
          <button className="ql-list" value="ordered" />
          <button className="ql-list" value="bullet" />
        </span>
        <span className="ql-formats">
          <button className="ql-link" />
        </span>
      </div>
    ),
    []
  );

  return (
    <div className={className}>
      {toolbarContent}

      <ReactQuill
        {...props}
        modules={{
          toolbar: {
            container: "#toolbar",
          },
        }}
      />
    </div>
  );
};

export default CustomizedReactQuill;
