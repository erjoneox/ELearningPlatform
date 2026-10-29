import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import "./Dashboard.css";

const roleDetails = {
  Student: {
    title: "Mësimi yt, me një shikim",
    description:
      "Ndiq progresin në kurse, kontrollo afatet dhe shiko vlerësimet e tua.",
  },
  Instructor: {
    title: "Përmbledhja e mësimdhënies",
    description:
      "Menaxho kurset dhe kontrollo dorëzimet që presin vlerësim.",
  },
  Admin: {
    title: "Përmbledhja e platformës",
    description:
      "Monitoro aktivitetin, kurset dhe dorëzimet që presin vlerësim.",
  },
};

const statisticDetails = {
  Student: [
    { key: "EnrolledCourses", label: "Kurset e mia", icon: "K" },
    { key: "PendingAssignments", label: "Detyra të hapura", icon: "D" },
    { key: "DueToday", label: "Afati sot", icon: "S", tone: "warning" },
    { key: "SubmittedAssignments", label: "Dorëzime të bëra", icon: "✓" },
    { key: "CompletedLessons", label: "Mësime të përfunduara", icon: "M" },
    { key: "QuizAttempts", label: "Kuize të përfunduara", icon: "Q" },
  ],
  Instructor: [
    { key: "ActiveCourses", label: "Kurse aktive", icon: "K" },
    { key: "Students", label: "Studentë në kurse", icon: "S" },
    {
      key: "UngradedSubmissions",
      label: "Presin vlerësim",
      icon: "!",
      tone: "warning",
    },
    { key: "TotalAssignments", label: "Detyra të publikuara", icon: "D" },
    { key: "TotalSubmissions", label: "Dorëzime gjithsej", icon: "✓" },
  ],
  Admin: [
    { key: "ActiveUsers", label: "Përdorues aktivë", icon: "P" },
    { key: "Students", label: "Studentë", icon: "S" },
    { key: "Instructors", label: "Instruktorë", icon: "I" },
    { key: "ActiveCourses", label: "Kurse aktive", icon: "K" },
    { key: "ActiveEnrollments", label: "Regjistrime aktive", icon: "R" },
    { key: "TotalSubmissions", label: "Dorëzime gjithsej", icon: "✓" },
    {
      key: "UngradedSubmissions",
      label: "Presin vlerësim",
      icon: "!",
      tone: "warning",
    },
  ],
};

function formatDate(value, includeTime = false) {
  if (!value) return "Pa afat";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Datë e pavlefshme";

  return new Intl.DateTimeFormat("sq-AL", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" } : {}),
  }).format(date);
}

function StatCard({ label, value, icon, tone }) {
  return (
    <article className={`dashboard-stat dashboard-stat-${tone || "primary"}`}>
      <span className="dashboard-stat-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="dashboard-stat-label">{label}</p>
        <p className="dashboard-stat-value">{Number(value || 0).toLocaleString("sq-AL")}</p>
      </div>
    </article>
  );
}

function Section({ title, description, action, children, className = "" }) {
  return (
    <section className={`dashboard-panel ${className}`}>
      <div className="dashboard-panel-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ children }) {
  return <div className="dashboard-empty">{children}</div>;
}

function AssignmentList({ items, emptyText, status }) {
  if (!items?.length) return <EmptyState>{emptyText}</EmptyState>;

  return (
    <div className="dashboard-list">
      {items.map((assignment) => (
        <article className="dashboard-list-item" key={assignment.AssignmentID}>
          <span className={`dashboard-status-dot dashboard-status-${status}`} />
          <div className="dashboard-list-content">
            <h3>{assignment.Title}</h3>
            <p>
              {assignment.CourseTitle}
              {assignment.InstructorName
                ? ` · ${assignment.InstructorName}`
                : ""}
            </p>
          </div>
          <div className="dashboard-list-meta">
            <span>{formatDate(assignment.DueDate, true)}</span>
            <Link
              to={`/courses/${assignment.CourseID}`}
              className="dashboard-text-link"
            >
              Hap kursin
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function SubmissionList({ items, emptyText, instructorView = false }) {
  if (!items?.length) return <EmptyState>{emptyText}</EmptyState>;

  return (
    <div className="dashboard-list">
      {items.map((submission) => (
        <article
          className="dashboard-list-item"
          key={submission.SubmissionID}
        >
          <span className="dashboard-submission-icon" aria-hidden="true">
            {submission.Grade == null ? "!" : "✓"}
          </span>
          <div className="dashboard-list-content">
            <h3>
              {instructorView
                ? submission.StudentName
                : submission.AssignmentTitle}
            </h3>
            <p>
              {instructorView
                ? `${submission.AssignmentTitle} · ${submission.CourseTitle}`
                : submission.CourseTitle}
            </p>
          </div>
          <div className="dashboard-list-meta">
            {instructorView ? (
              <span>{formatDate(submission.SubmittedAt, true)}</span>
            ) : (
              <>
                <span>
                  {submission.Grade == null
                    ? "Në pritje"
                    : `Nota: ${submission.Grade} / ${submission.MaxPoints}`}
                </span>
                <Link
                  to={`/courses/${submission.CourseID}`}
                  className="dashboard-text-link"
                >
                  Shiko punën
                </Link>
              </>
            )}
            {instructorView && (
              <Link
                to={`/courses/${submission.CourseID}`}
                className="dashboard-text-link"
              >
                Hap kursin
              </Link>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function CourseProgressList({ courses }) {
  if (!courses?.length) {
    return (
      <EmptyState>
        Ende nuk je regjistruar në një kurs.{" "}
        <Link to="/courses" className="dashboard-text-link">
          Eksploro kurset
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="dashboard-course-grid">
      {courses.map((course) => (
        <article className="dashboard-course-card" key={course.CourseID}>
          <div className="dashboard-course-card-top">
            <span className="dashboard-course-mark" aria-hidden="true">
              {course.CourseTitle?.charAt(0)?.toUpperCase() || "K"}
            </span>
            <span className="dashboard-course-percent">{course.progress}%</span>
          </div>
          <h3>{course.CourseTitle}</h3>
          <p>
            {course.completedLessons} nga {course.totalLessons} mësime të
            përfunduara
          </p>
          <div
            className="progress dashboard-progress"
            role="progressbar"
            aria-label={`Progresi në kursin ${course.CourseTitle}`}
            aria-valuenow={course.progress}
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div
              className="progress-bar"
              style={{ width: `${course.progress}%` }}
            />
          </div>
          <Link
            to={`/courses/${course.CourseID}`}
            className="dashboard-text-link"
          >
            Vazhdo kursin <span aria-hidden="true">→</span>
          </Link>
        </article>
      ))}
    </div>
  );
}

function InstructorCourseList({ courses }) {
  if (!courses?.length) {
    return (
      <EmptyState>
        Nuk ke kurse aktive.{" "}
        <Link to="/courses" className="dashboard-text-link">
          Krijo kurs
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="dashboard-course-grid">
      {courses.map((course) => (
        <article className="dashboard-course-card" key={course.CourseID}>
          <div className="dashboard-course-card-top">
            <span className="dashboard-course-mark" aria-hidden="true">
              {course.Title?.charAt(0)?.toUpperCase() || "K"}
            </span>
            {Number(course.UngradedSubmissions) > 0 && (
              <span className="dashboard-count-badge">
                {course.UngradedSubmissions} për vlerësim
              </span>
            )}
          </div>
          <h3>{course.Title}</h3>
          <p>
            {course.Students} studentë · {course.Assignments} detyra
          </p>
          <Link
            to={`/courses/${course.CourseID}`}
            className="dashboard-text-link"
          >
            Menaxho kursin <span aria-hidden="true">→</span>
          </Link>
        </article>
      ))}
    </div>
  );
}

function AdminCourseList({ courses }) {
  if (!courses?.length) {
    return <EmptyState>Nuk ka kurse aktive për momentin.</EmptyState>;
  }

  return (
    <div className="dashboard-list">
      {courses.map((course) => (
        <article className="dashboard-list-item" key={course.CourseID}>
          <span className="dashboard-course-mark dashboard-course-mark-small">
            {course.Title?.charAt(0)?.toUpperCase() || "K"}
          </span>
          <div className="dashboard-list-content">
            <h3>{course.Title}</h3>
            <p>
              {course.InstructorName} · {course.Students} studentë ·{" "}
              {course.Assignments} detyra
            </p>
          </div>
          <div className="dashboard-list-meta">
            <span>{formatDate(course.CreatedAt)}</span>
            <Link
              to={`/courses/${course.CourseID}`}
              className="dashboard-text-link"
            >
              Shiko kursin
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/dashboard");
      setDashboard(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Nuk u arrit të ngarkohen të dhënat e dashboard-it.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const role = dashboard?.role || user?.role;
  const roleContent = roleDetails[role];
  const statCards = statisticDetails[role] || [];

  return (
    <>
      <Navbar />
      <main className="dashboard-page">
        <div className="container dashboard-container">
          <header className="dashboard-hero">
            <div>
              <span className="dashboard-eyebrow">
                {role === "Student"
                  ? "HAPËSIRA E STUDENTIT"
                  : role === "Instructor"
                    ? "HAPËSIRA E INSTRUKTORIT"
                    : "ADMINISTRIMI I PLATFORMËS"}
              </span>
              <h1>
                {roleContent?.title || "Dashboard"}
                {user?.firstName ? `, ${user.firstName}` : ""}
              </h1>
              <p>
                {roleContent?.description ||
                  "Mirë se erdhe në platformën e mësimit online."}
              </p>
            </div>
            <Link to="/courses" className="btn dashboard-primary-button">
              {role === "Instructor" || role === "Admin"
                ? "Menaxho kurset"
                : "Eksploro kurset"}
              <span aria-hidden="true">→</span>
            </Link>
          </header>

          {loading && (
            <div className="dashboard-loading" role="status">
              <span className="spinner-border spinner-border-sm" />
              Duke ngarkuar dashboard-in...
            </div>
          )}

          {!loading && error && (
            <div className="alert alert-danger dashboard-error" role="alert">
              <span>{error}</span>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={loadDashboard}
              >
                Provo përsëri
              </button>
            </div>
          )}

          {!loading && dashboard && (
            <>
              <section
                className="dashboard-stat-grid"
                aria-label="Statistikat kryesore"
              >
                {statCards.map((card) => (
                  <StatCard
                    key={card.key}
                    label={card.label}
                    value={dashboard.statistics?.[card.key]}
                    icon={card.icon}
                    tone={card.tone}
                  />
                ))}
              </section>

              {role === "Student" && (
                <>
                  <Section
                    title="Progresi në kurset e mia"
                    description="Vazhdo aty ku e ke lënë."
                    action={
                      <Link to="/my-courses" className="dashboard-text-link">
                        Të gjitha kurset
                      </Link>
                    }
                    className="dashboard-section-spaced"
                  >
                    <CourseProgressList courses={dashboard.courses} />
                  </Section>

                  <div className="dashboard-two-column">
                    <Section
                      title="Afati sot"
                      description="Detyrat që duhet t’i dorëzosh sot."
                    >
                      <AssignmentList
                        items={dashboard.dueToday}
                        status="today"
                        emptyText="Nuk ke detyra me afat sot."
                      />
                    </Section>
                    <Section
                      title="Afate të ardhshme"
                      description="Planifiko kohën për detyrat e radhës."
                    >
                      <AssignmentList
                        items={dashboard.upcomingAssignments}
                        status="upcoming"
                        emptyText="Nuk ka detyra me afat të ardhshëm."
                      />
                    </Section>
                    <Section
                      title="Afati ka kaluar"
                      description="Detyra të pambaruara me afat të kaluar."
                    >
                      <AssignmentList
                        items={dashboard.overdueAssignments}
                        status="overdue"
                        emptyText="Nuk ke detyra të vonuara."
                      />
                    </Section>
                    <Section
                      title="Pa afat të caktuar"
                      description="Detyra që presin dorëzimin tënd."
                    >
                      <AssignmentList
                        items={dashboard.noDeadlineAssignments}
                        status="upcoming"
                        emptyText="Nuk ke detyra pa afat."
                      />
                    </Section>
                  </div>

                  <Section
                    title="Dorëzimet e mia"
                    description="Dorëzimet e fundit dhe vlerësimet e tyre."
                    className="dashboard-section-spaced"
                  >
                    <SubmissionList
                      items={dashboard.recentSubmissions}
                      emptyText="Ende nuk ke dorëzuar detyra."
                    />
                  </Section>
                </>
              )}

              {role === "Instructor" && (
                <>
                  <Section
                    title="Kurset e mia"
                    description="Studentët, detyrat dhe gjendja e vlerësimit."
                    action={
                      <Link to="/courses" className="dashboard-text-link">
                        Krijo ose ndrysho kurs
                      </Link>
                    }
                    className="dashboard-section-spaced"
                  >
                    <InstructorCourseList courses={dashboard.courses} />
                  </Section>
                  <Section
                    title="Dorëzime për vlerësim"
                    description="Dorëzimet e fundit që presin notë dhe koment."
                    className="dashboard-section-spaced"
                  >
                    <SubmissionList
                      items={dashboard.ungradedSubmissions}
                      instructorView
                      emptyText="Nuk ka dorëzime që presin vlerësim."
                    />
                  </Section>
                </>
              )}

              {role === "Admin" && (
                <>
                  <Section
                    title="Kurset e fundit"
                    description="Kurse aktive dhe aktiviteti i tyre."
                    action={
                      <Link to="/courses" className="dashboard-text-link">
                        Shiko kurset
                      </Link>
                    }
                    className="dashboard-section-spaced"
                  >
                    <AdminCourseList courses={dashboard.recentCourses} />
                  </Section>
                  <Section
                    title="Dorëzime pa vlerësim"
                    description="Dorëzimet që kërkojnë vëmendje."
                    className="dashboard-section-spaced"
                  >
                    <SubmissionList
                      items={dashboard.ungradedSubmissions}
                      instructorView
                      emptyText="Të gjitha dorëzimet janë vlerësuar."
                    />
                  </Section>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}

export default Dashboard;
