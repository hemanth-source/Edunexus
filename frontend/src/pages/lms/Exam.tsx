import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle,
  Clock,
  Calendar,
  Award,
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  X,
} from "lucide-react";

import { api } from "@/lib/api";
import { useAuth } from "@/hooks/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { exam, Submission } from "@/types";
import ExamRadio from "@/components/lms/ExamRadio";

const Exam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  const [exam, setExam] = useState<exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Student Answers State: { [questionId]: "Selected Option" }
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submission, setSubmission] = useState<Submission | null>(null);
  const totalPoints = submission && exam ? exam.questions.length : 0;
  const percentage =
    submission && totalPoints > 0
      ? Math.round((submission.score / totalPoints) * 100)
      : 0;

  // Manage Questions States
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // Question Form States
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<"MCQ" | "SHORT_ANSWER">("MCQ");
  const [options, setOptions] = useState<string[]>(["", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [points, setPoints] = useState<number>(5);

  // handle fetch exam details
  const fetch = async () => {
    setLoading(true);
    await api
      .get(`/exams/${id}`)
      .then((res) => {
        setExam(res.data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load exam");
        navigate("/lms/exams");
        setLoading(false);
      });
    setLoading(true);
    if (isStudent) {
      await api
        .get(`/exams/${id}/result`)
        .then((res) => {
          setLoading(false);
          setSubmission(res.data);
        })
        .catch(() => {
          setLoading(false);
          setSubmission(null);
        });
    }
  };

  useEffect(() => {
    if (id) fetch();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!exam) {
    navigate("/lms/exams");
    return;
  }

  if (!exam.isActive && !isTeacher) {
    navigate("/lms/exams");
    return;
  }

  if (!exam.isActive && !isTeacher) {
    navigate("/lms/exams");
    return;
  }

  const isExpired = exam.isActive && new Date() > new Date(exam.dueDate);
  if ((!exam.isActive || isExpired) && !isTeacher) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
        <Clock className="h-12 w-12 text-accent-foreground" />
        <h2 className="text-xl font-bold">Exam Unavailable</h2>
        <p className="text-muted-foreground">
          This exam is currently closed or has expired.
        </p>
        <Button onClick={() => navigate("/lms/exams")}>Back to List</Button>
      </div>
    );
  }

  const handleTeacherDelete = async () => {
    if (!confirm("Are you sure you want to delete this exam?")) return;
    try {
      await api.delete(`/exams/${id}`); // Ensure delete route exists
      toast.success("Exam deleted");
      navigate("/lms/exams");
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleStudentSubmit = async () => {
    if (!exam) return;

    // Validate if all questions answered (Optional)
    if (Object.keys(answers).length < exam.questions.length) {
      toast.error("Please answer all questions before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      // Transform answers map to array for backend
      const payload = Object.entries(answers).map(([qId, ans]) => ({
        questionId: qId,
        answer: ans,
      }));

      const { data } = await api.post(`/exams/${id}/submit`, {
        answers: payload,
      });
      toast.success(`Exam submitted! Score: ${data.score}`);
      navigate("/lms/exams");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      const { data } = await api.patch(`/exams/${id}/status`);
      toast.success(data.message);
      fetch(); // Refresh the list to update the UI
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  // Manage Questions Handlers
  const handleOpenAddQuestion = () => {
    setEditingQuestionId(null);
    setQuestionText("");
    setQuestionType("MCQ");
    setOptions(["", "", ""]);
    setCorrectAnswer("");
    setPoints(5);
    setIsQuestionModalOpen(true);
  };

  const handleOpenEditQuestion = (q: any) => {
    setEditingQuestionId(q._id);
    setQuestionText(q.questionText);
    setQuestionType(q.type || "MCQ");
    setOptions(q.options && q.options.length > 0 ? [...q.options] : ["", "", ""]);
    setCorrectAnswer(q.correctAnswer || "");
    setPoints(q.points || 5);
    setIsQuestionModalOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!exam) return;
    if (!questionText.trim() || !correctAnswer.trim()) {
      toast.warning("Please fill out the question text and correct answer.");
      return;
    }

    let cleanedOptions: string[] = [];
    if (questionType === "MCQ") {
      cleanedOptions = options.map((opt) => opt.trim()).filter((opt) => opt !== "");
      if (cleanedOptions.length < 2) {
        toast.warning("Please provide at least 2 options for an MCQ question.");
        return;
      }
      if (!cleanedOptions.includes(correctAnswer.trim())) {
        toast.warning("The correct answer must be one of the specified options.");
        return;
      }
    }

    try {
      setLoading(true);
      let updatedQuestions = [...exam.questions];

      const questionPayload = {
        questionText: questionText.trim(),
        type: questionType,
        options: questionType === "MCQ" ? cleanedOptions : [],
        correctAnswer: correctAnswer.trim(),
        points,
      };

      if (editingQuestionId) {
        // Edit mode
        updatedQuestions = updatedQuestions.map((q) =>
          q._id === editingQuestionId ? { ...q, ...questionPayload } : q
        );
      } else {
        // Add mode
        updatedQuestions.push(questionPayload as any);
      }

      await api.put(`/exams/${id}/questions`, { questions: updatedQuestions });
      toast.success(editingQuestionId ? "Question updated successfully." : "Question added successfully.");
      setIsQuestionModalOpen(false);
      fetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save question.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!exam) return;
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      setLoading(true);
      const updatedQuestions = exam.questions.filter((q) => q._id !== qId);
      await api.put(`/exams/${id}/questions`, { questions: updatedQuestions });
      toast.success("Question deleted successfully.");
      fetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete question.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{exam.title}</h1>
          <Badge variant={exam.isActive ? "default" : "secondary"}>
            {exam.isActive ? "Active" : "Draft"}
          </Badge>
        </div>
        <div className="flex gap-4 text-muted-foreground text-sm">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" /> {exam.duration} Minutes
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" /> Due:{" "}
            {new Date(exam.dueDate).toLocaleDateString()}
          </div>
        </div>
      </div>
      {/* to test logout and sign in as student */}
      {/* Teacher Control: Toggle Status */}
      {isTeacher && (
        <>
          <Separator />
          <div className="bg-card p-4 rounded-lg flex items-center justify-between border">
            <div className="text-lg font-semibold">Teacher Controls</div>
            <div className="flex gap-2 ml-2">
              <Button onClick={() => navigate("/lms/exams")}>
                Back to List
              </Button>
              <Button
                variant={exam.isActive ? "destructive" : "default"}
                onClick={handleToggleStatus}
              >
                {exam.isActive ? "Unpublish Exam" : "Publish Exam"}
              </Button>
              <Button variant="outline" onClick={handleOpenAddQuestion}>
                <Plus className="h-4 w-4 mr-2" /> Add Question
              </Button>
              <Button variant="destructive" onClick={handleTeacherDelete}>
                Delete Exam
              </Button>
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Student Results Section currently false */}
      {isStudent && submission && (
        <>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <Award className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="text-center">
                <h1 className="text-3xl font-bold">Exam Results</h1>
                <p className="text-muted-foreground">You scored</p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold text-primary">
                  {submission.score}
                </span>
                <span className="text-2xl text-muted-foreground">
                  / {totalPoints}
                </span>
              </div>
              <Badge
                variant={percentage >= 50 ? "default" : "destructive"}
                className="text-lg px-4 py-1"
              >
                {percentage}%
              </Badge>
            </CardContent>
          </Card>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/lms/exams")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Exams
            </Button>
            <h2 className="text-xl font-semibold ml-auto">Review Answers</h2>
          </div>
        </>
      )}

      {/* questions list */}
      <div className="space-y-6">
        {exam.questions.map((q, index) => (
          <Card key={q._id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium flex items-start justify-between gap-4 w-full">
                <div className="flex gap-2 items-start">
                  <span className="text-muted-foreground">{index + 1}.</span>
                  <span>{q.questionText}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-1 rounded">
                    {q.points} pts
                  </span>
                  {isTeacher && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => handleOpenEditQuestion(q)}
                        title="Edit Question"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-rose-400 transition-colors"
                        onClick={() => handleDeleteQuestion(q._id)}
                        title="Delete Question"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isTeacher ? (
                // TEACHER VIEW: List options, highlight correct one
                <ul className="space-y-2">
                  {q.options.map((opt, i) => (
                    <li
                      key={i}
                      className={`p-3 rounded-md border flex items-center gap-2 ${
                        opt === q.correctAnswer
                          ? "bg-primary font-medium"
                          : "bg-black/20 dark:bg-black/70"
                      }`}
                    >
                      {opt === q.correctAnswer && (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      {opt}
                    </li>
                  ))}
                </ul>
              ) : (
                // STUDENT VIEW: Radio Group
                <ExamRadio
                  answers={answers}
                  question={q}
                  setAnswers={setAnswers}
                  submission={submission}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Footer Actions */}
      <div className="flex justify-end gap-4 pt-4">
        {isStudent && !submission && (
          <Button
            size="lg"
            className="w-full md:w-auto min-w-50"
            onClick={handleStudentSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Submit Exam"
            )}
          </Button>
        )}
      </div>
      
      {/* Manage Question Dialog */}
      {isTeacher && (
        <Dialog open={isQuestionModalOpen} onOpenChange={setIsQuestionModalOpen}>
          <DialogContent className="max-w-md bg-card border border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {editingQuestionId ? "Edit Question" : "Add New Question"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Question Text */}
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Question Text</label>
                <textarea
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm min-h-[80px]"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Enter the question text"
                />
              </div>

              {/* Question Type */}
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Question Type</label>
                <select
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  value={questionType}
                  onChange={(e: any) => {
                    setQuestionType(e.target.value);
                    setCorrectAnswer("");
                  }}
                >
                  <option value="MCQ">Multiple Choice (MCQ)</option>
                  <option value="SHORT_ANSWER">Short Answer</option>
                </select>
              </div>

              {/* MCQ Options */}
              {questionType === "MCQ" && (
                <div className="space-y-3">
                  <label className="text-sm font-semibold">Options</label>
                  {options.map((opt, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...options];
                          newOpts[i] = e.target.value;
                          setOptions(newOpts);
                        }}
                        placeholder={`Option ${i + 1}`}
                      />
                      {options.length > 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-rose-400 shrink-0"
                          onClick={() => {
                            setOptions(options.filter((_, idx) => idx !== i));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOptions([...options, ""])}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Option
                  </Button>
                </div>
              )}

              {/* Correct Answer */}
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Correct Answer</label>
                {questionType === "MCQ" ? (
                  <select
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                  >
                    <option value="">Select Correct Option</option>
                    {options.filter(opt => opt.trim() !== "").map((opt, i) => (
                      <option key={i} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    placeholder="Enter correct answer"
                  />
                )}
              </div>

              {/* Points */}
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Points</label>
                <input
                  type="number"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  min="1"
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2 justify-end pt-2 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setIsQuestionModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveQuestion}>
                {editingQuestionId ? "Save Changes" : "Add Question"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
// show the result since I'm an admin
export default Exam;
