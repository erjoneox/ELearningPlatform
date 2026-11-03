import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

const roleDetails = {
  Student: {
    title: "Welcome back",
    description: "Your courses, learning progress, and next steps at a glance.",
  },
  Instructor: {
    title: "Teaching Overview",
    description: "Manage your courses and review student submissions.",
  },
  Admin: {
    title: "Platform Overview",
    description: "Monitor courses, users, and pending submissions.",
  },
};

const statisticDetails = {
  Student: [
    { key: "EnrolledCourses", label: "My Courses", icon: "K" },
    { key: "PendingAssignments", label: "Pending Assignments", icon: "D" },
    { key: "DueToday", label: "Due Today", icon: "S", tone: "warning" },
    { key: "SubmittedAssignments", label: "Submitted", icon: "✓" },
    { key: "CompletedLessons", label: "Completed Lessons", icon: "M" },
    { key: "QuizAttempts", label: "Quiz Attempts", icon: "Q" },
  ],
  Instructor: [
    { key: "ActiveCourses", label: "Active Courses", icon: "K" },
    { key: "Students", label: "Students", icon: "S" },
    {
      key: "UngradedSubmissions",
      label: "Ungraded",
      icon: "!",
      tone: "warning",
    },
    { key: "TotalAssignments", label: "Assignments", icon: "D" },
    { key: "TotalSubmissions", label: "Submissions", icon: "✓" },
  ],
  Admin: [
    { key: "ActiveUsers", label: "Active Users", icon: "P" },
    { key: "Students", label: "Students", icon: "S" },
    { key: "Instructors", label: "Instructors", icon: "I" },
    { key: "ActiveCourses", label: "Active Courses", icon: "K" },
    { key: "ActiveEnrollments", label: "Enrollments", icon: "R" },
  ],
};

function formatDate(value, includeTime = false) {
  if (!value) return "No date set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat(undefined, {
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
        <p className="dashboard-stat-value">
          {Number(value || 0).toLocaleString()}
        </p>
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

function CourseList({
  courses,
  instructorView = false,
  adminView = false,
  emptyText,
}) {
  if (!courses?.length) return <EmptyState>{emptyText}</EmptyState>;

  return (
    <div className="dashboard-course-grid">
      {courses.map((course) => {
        const progress = Number(course.progress || 0);
        const title = course.CourseTitle || course.Title || "Course";
        const thumbnail = course.Thumbnail || course.thumbnail;

        return (
          <article
            className="dashboard-course-card"
            key={course.CourseID}
            style={
              thumbnail
                ? { "--dashboard-course-image": `url("${thumbnail}")` }
                : undefined
            }
          >
            {thumbnail && (
              <img
                className="dashboard-course-background"
                src={thumbnail}
                alt=""
                aria-hidden="true"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            )}
            <div className="dashboard-course-card-content">
              <div className="dashboard-course-card-top">
                <span className="dashboard-course-mark" aria-hidden="true">
                  {title.slice(0, 1).toUpperCase()}
                </span>
                {instructorView ? (
                  <span className="dashboard-count-badge">
                    {Number(course.Students || 0)} students
                  </span>
                ) : (
                  <span className="dashboard-course-percent">{progress}%</span>
                )}
              </div>
              <h3 title={title}>{title}</h3>
              <p>
                {instructorView
                  ? `${Number(course.Assignments || 0)} assignments · ${Number(course.UngradedSubmissions || 0)} awaiting review`
                  : `${Number(course.completedLessons || 0)} of ${Number(course.totalLessons || 0)} lessons completed`}
              </p>
              {!instructorView && (
                <div
                  className="progress dashboard-progress"
                  role="progressbar"
                  aria-label={`${title} progress`}
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="progress-bar"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
              <Link
                to={`/courses/${course.CourseID}`}
                className="dashboard-text-link"
              >
                {instructorView && !adminView
                  ? "Manage course"
                  : adminView
                    ? "View course"
                    : "Continue learning"}{" "}
                →
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function SubmissionList({ items, emptyText }) {
  if (!items?.length) return <EmptyState>{emptyText}</EmptyState>;

  return (
    <div className="dashboard-list">
      {items.map((submission) => (
        <article className="dashboard-list-item" key={submission.SubmissionID}>
          <span className="dashboard-submission-icon" aria-hidden="true">
            !
          </span>
          <div className="dashboard-list-content">
            <h3>{submission.StudentName}</h3>
            <p>
              {submission.AssignmentTitle} · {submission.CourseTitle}
            </p>
          </div>
          <div className="dashboard-list-meta">
            <span>{formatDate(submission.SubmittedAt, true)}</span>
            <Link
              to={`/courses/${submission.CourseID}?assignment=${submission.AssignmentID}#assignment-${submission.AssignmentID}`}
              className="dashboard-text-link"
            >
              Review
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function UpcomingQuizList({ quizzes }) {
  if (!quizzes?.length) {
    return (
      <div className="dashboard-empty">
        You’re nailing it — no upcoming quizzes to worry about right now.
      </div>
    );
  }

  return (
    <div className="dashboard-list">
      {quizzes.map((quiz) => {
        const quizUrl = `/courses/${quiz.CourseID}#quiz-${quiz.QuizID}`;
        const isScheduled = quiz.ScheduledStartAt != null;

        return (
          <article className="dashboard-list-item" key={quiz.QuizID}>
            <span className="dashboard-status-dot dashboard-status-upcoming" />
            <div className="dashboard-list-content">
              <h3>{quiz.Title}</h3>
              <p>{quiz.CourseTitle}</p>
            </div>
            <div className="dashboard-list-meta">
              <span>
                {isScheduled
                  ? `Opens ${formatDate(quiz.ScheduledStartAt, true)}`
                  : quiz.QuizStatus === "InProgress"
                    ? "Resume your attempt"
                    : quiz.DurationMinutes
                      ? `${quiz.DurationMinutes} minutes`
                      : "Ready when you are"}
              </span>
              <Link to={quizUrl} className="dashboard-text-link">
                {quiz.QuizStatus === "InProgress"
                  ? "Continue quiz"
                  : "Open quiz"}
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function RecentMaterialList({ materials }) {
  if (!materials?.length) {
    return (
      <div className="dashboard-empty">
        No new course materials in the last 24 hours. Keep up your great work!
      </div>
    );
  }

  return (
    <div className="dashboard-list">
      {materials.map((material) => (
        <article className="dashboard-list-item" key={material.MaterialID}>
          <span className="dashboard-submission-icon" aria-hidden="true">
            {material.MaterialType === "Video" ? "▶" : "↗"}
          </span>
          <div className="dashboard-list-content">
            <h3>{material.Title}</h3>
            <p>
              {material.CourseTitle} · {material.LessonTitle}
            </p>
          </div>
          <div className="dashboard-list-meta">
            <span>{formatDate(material.CreatedAt, true)}</span>
            <Link
              to={`/courses/${material.CourseID}?lesson=${material.LessonID}#material-${material.MaterialID}`}
              className="dashboard-text-link"
            >
              Open material
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function AssignmentList({ items, emptyText, status }) {
  if (!items?.length) return <EmptyState>{emptyText}</EmptyState>;

  return (
    <div className="dashboard-list">
      {items.map((assignment) => (
        <article className="dashboard-list-item" key={assignment.AssignmentID}>
          {status === "today" ? (
            <svg
              className="dashboard-status-icon dashboard-status-today"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          ) : (
            <span
              className={`dashboard-status-dot dashboard-status-${status}`}
            />
          )}
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
              View course
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function StudentDashboard({ dashboard }) {
  const primaryCourse = dashboard.courses?.[0];
  const progress = Number(primaryCourse?.progress || 0);

  return (
    <div className="row g-4">
      {/* Left Column */}
      <div className="col-lg-8">
        {/* Ongoing Course Hero Banner */}
        <div
          className="text-white p-4 rounded-4 position-relative overflow-hidden shadow-sm mb-4 d-flex flex-column justify-content-between"
          style={{ backgroundColor: "#5640EE", minHeight: "220px" }}
        >
          <div>
            <span
              className="text-uppercase fw-bold text-white-50"
              style={{ fontSize: "0.7rem", letterSpacing: "0.05rem" }}
            >
              Ongoing Course
            </span>
            <h3
              className="fw-bold display-6 mt-1 mb-2"
              style={{ fontSize: "1.5rem" }}
            >
              {primaryCourse
                ? primaryCourse.CourseTitle
                : "Welcome to EduFlow Learning"}
            </h3>
            <p className="text-white-50 small mb-4">
              {primaryCourse
                ? "Continue mastering your current module and lessons."
                : "Explore your enrolled courses to start learning."}
            </p>
          </div>

          <div>
            {primaryCourse && (
              <>
                <div className="d-flex justify-content-between align-items-center mb-1 small fw-semibold">
                  <span>Progress</span>
                  <span>{progress}% Complete</span>
                </div>
                <div
                  className="progress bg-white bg-opacity-25 mb-3"
                  style={{ height: "6px" }}
                >
                  <div
                    className="progress-bar bg-white rounded-pill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </>
            )}
            <Link
              to={
                primaryCourse
                  ? `/courses/${primaryCourse.CourseID}`
                  : "/courses"
              }
              className="btn btn-light fw-semibold text-dark px-4 py-2 rounded-3 shadow-sm"
              style={{ fontSize: "0.85rem" }}
            >
              {primaryCourse ? "Continue Watching" : "Explore Courses"}
            </Link>
          </div>
        </div>

        {/* Recent Materials Section */}
        <div className="mb-4">
          <Section
            title="Recent materials"
            description="Materials added to your courses recently."
          >
            <RecentMaterialList materials={dashboard.recentMaterials} />
          </Section>
        </div>

        {/* My Learning Progress Grid */}
        <div className="mb-4">
          <Section
            title="My learning progress"
            description="Pick up where you left off in an enrolled course."
            action={
              <Link to="/my-courses" className="dashboard-text-link">
                All courses
              </Link>
            }
          >
            <CourseList
              courses={dashboard.courses}
              emptyText="You’re not enrolled in a course yet. Explore courses to get started."
            />
          </Section>
        </div>
      </div>

      {/* Right Column */}
      <div className="col-lg-4">
        {/* Upcoming Quizzes Card */}
        <div className="mb-4">
          <Section
            title="Upcoming quizzes"
            description="Available quizzes in your courses."
          >
            <UpcomingQuizList quizzes={dashboard.upcomingQuizzes} />
          </Section>
        </div>

        {/* Assignments Due Today Card */}
        <div className="mb-4">
          <Section
            title="Assignments due today"
            description="Stay on top of today’s deadlines."
          >
            <AssignmentList
              items={dashboard.dueToday}
              status="today"
              emptyText="No assignments are due today. You’re nailing it!"
            />
          </Section>
        </div>
      </div>
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
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Failed to load dashboard data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    api
      .get("/dashboard")
      .then((response) => {
        if (active) setDashboard(response.data);
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              "Failed to load dashboard data.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const role = dashboard?.role || user?.role;
  const roleContent = roleDetails[role];
  const statCards = statisticDetails[role] || [];

  return (
    <main className="dashboard-page bg-light min-vh-100 py-4 px-3 px-md-5">
      <div className="container-fluid" style={{ maxWidth: "1200px" }}>
        <div className="mb-4">
          <h1 className="fw-bold text-dark fs-1 mb-1">
            {user?.firstName
              ? `Great to see you, ${user.firstName}!`
              : "Great to see you again!"}
          </h1>
          <p className="text-muted small">
            {roleContent?.description ||
              "Your learning and teaching overview at a glance."}
          </p>
        </div>

        {loading && (
          <div className="text-center py-5" role="status">
            <span className="spinner-border spinner-border-sm text-primary" />
            <span className="ms-2 text-muted">Loading dashboard...</span>
          </div>
        )}

        {!loading && error && (
          <div
            className="alert alert-danger py-2 px-3 small d-flex justify-content-between align-items-center"
            role="alert"
          >
            <span>{error}</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={loadDashboard}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && dashboard && role === "Student" && (
          <StudentDashboard dashboard={dashboard} />
        )}

        {!loading && dashboard && role !== "Student" && (
          <>
            <section className="dashboard-stat-grid mb-4">
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

            {role === "Instructor" && (
              <div className="dashboard-two-column">
                <Section
                  title="My courses"
                  description="Manage your active courses and see enrollment activity."
                  action={
                    <Link to="/courses" className="dashboard-text-link">
                      Manage courses
                    </Link>
                  }
                >
                  <CourseList
                    courses={dashboard.courses}
                    instructorView
                    emptyText="You don’t have any active courses yet."
                  />
                </Section>
                <Section
                  title="Pending submissions"
                  description="Student work waiting for review."
                >
                  <SubmissionList
                    items={dashboard.ungradedSubmissions}
                    emptyText="No pending submissions. You’re all caught up!"
                  />
                </Section>
              </div>
            )}

            {role === "Admin" && (
              <div className="dashboard-two-column">
                <Section
                  title="Recent courses"
                  description="Active courses on the platform."
                  action={
                    <div className="d-flex gap-3">
                      <Link to="/courses" className="dashboard-text-link">
                        All courses
                      </Link>
                      <Link to="/admin/users" className="dashboard-text-link">
                        Manage users
                      </Link>
                    </div>
                  }
                >
                  <CourseList
                    courses={dashboard.recentCourses}
                    instructorView
                    adminView
                    emptyText="There are no active courses."
                  />
                </Section>
                <Section
                  title="Administration"
                  description="Manage platform courses and user accounts."
                  action={
                    <Link to="/admin/users" className="dashboard-text-link">
                      Manage users
                    </Link>
                  }
                >
                  <div className="d-flex flex-wrap gap-3">
                    <Link to="/courses" className="btn btn-primary">
                      Manage courses
                    </Link>
                    <Link to="/admin/users" className="btn btn-outline-primary">
                      Manage users
                    </Link>
                  </div>
                </Section>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default Dashboard;
