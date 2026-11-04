import "./ManagementFormPanel.css";

function ManagementFormPanel({
  as: Element = "section",
  eyebrow = "MENAXHIMI",
  title,
  description,
  children,
  className = "",
  ...elementProps
}) {
  return (
    <Element
      className={`management-form-panel card border-0 shadow-sm rounded-4 overflow-hidden ${className}`}
      {...elementProps}
    >
      <div className="row g-0">
        <aside className="col-lg-3 management-form-panel-aside text-white p-4 d-flex flex-column justify-content-between">
          <div>
            <span className="badge rounded-pill bg-white bg-opacity-25 text-white px-3 py-2 mb-3">
              {eyebrow}
            </span>
            <h2 className="h4 fw-bold mb-2">{title}</h2>
            <p className="small text-white-50 mb-0">{description}</p>
          </div>
        </aside>
        <div className="col-lg-9 p-4 p-md-5">{children}</div>
      </div>
    </Element>
  );
}

export default ManagementFormPanel;
