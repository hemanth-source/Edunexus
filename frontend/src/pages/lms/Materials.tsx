import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, BookOpen, FileText, Search, ExternalLink } from "lucide-react";

import { api } from "@/lib/api";
import { useAuth } from "@/hooks/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const Materials = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Form states
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [subject, setSubject] = useState("");
  const [classId, setClassId] = useState("");

  const isTeacherOrAdmin = user?.role === "teacher" || user?.role === "admin";

  useEffect(() => {
    fetchClassAndSubjects();
  }, []);

  const fetchClassAndSubjects = async () => {
    try {
      const classRes = await api.get("/classes");
      const subRes = await api.get("/subjects");

      if (classRes.data.classes && classRes.data.classes.length > 0) {
        setClasses(classRes.data.classes);
        const studentClassId = (user?.studentClass && typeof user.studentClass === "object" ? user.studentClass._id : user?.studentClass) as string | undefined;
        if (user?.role === "student" && studentClassId) {
          setSelectedClass(studentClassId);
        } else {
          setSelectedClass(classRes.data.classes[0]._id);
        }
      }
      if (subRes.data) {
        if (subRes.data.subjects && Array.isArray(subRes.data.subjects)) {
          setSubjects(subRes.data.subjects);
        } else if (Array.isArray(subRes.data)) {
          setSubjects(subRes.data);
        }
      }
    } catch (error) {
      toast.error("Failed to load initial class details.");
    }
  };

  useEffect(() => {
    if (selectedClass) {
      fetchMaterials();
    }
  }, [selectedClass]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/materials/class/${selectedClass}`);
      setMaterials(data);
    } catch (error) {
      toast.error("Failed to load materials.");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadMaterial = async () => {
    try {
      if (!title || !fileUrl || !subject || !classId) {
        toast.warning("Please fill out all required parameters.");
        return;
      }

      await api.post("/materials/upload", {
        title,
        description,
        fileUrl,
        subject,
        classId,
      });

      toast.success("Study material uploaded successfully.");
      setIsOpen(false);
      // Reset state
      setTitle("");
      setDescription("");
      setFileUrl("");
      setSubject("");
      setClassId("");
      
      fetchMaterials();
    } catch (error) {
      toast.error("Failed to upload material.");
    }
  };

  const filteredMaterials = materials.filter((material) => {
    return (
      material.title?.toLowerCase().includes(search.toLowerCase()) ||
      material.subject?.name?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Class & Resources</h1>
          <p className="text-muted-foreground">
            Access shared course study materials, balance guides, reference links, and slides.
          </p>
        </div>
        <div className="flex gap-2">
          {isTeacherOrAdmin && (
            <Button onClick={() => {
              setTitle("");
              setDescription("");
              setFileUrl("");
              setSubject("");
              setClassId(selectedClass);
              setIsOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" /> Upload Resource
            </Button>
          )}
        </div>
      </div>

      {/* Filter and search */}
      <div className="grid sm:grid-cols-3 gap-4">
        {isTeacherOrAdmin && (
          <Card className="bg-card/50 backdrop-blur-md border-border sm:col-span-1">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Select Class</label>
                <select
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className={`bg-card/50 backdrop-blur-md border-border ${isTeacherOrAdmin ? 'sm:col-span-2' : 'sm:col-span-3'}`}>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Live Resource Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by topic, syllabus name, or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Materials grid */}
      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground bg-card/20 border border-dashed border-border rounded-3xl">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-bold text-lg mb-1">No shared resources</h3>
          <p className="text-sm">There are no study materials uploaded matching the query.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((material) => (
            <Card key={material._id} className="bg-card/50 backdrop-blur-md border-border flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
              <CardHeader className="space-y-1">
                <div className="flex justify-between items-start">
                  <Badge className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">
                    {material.subject?.name}
                  </Badge>
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-lg font-bold pt-2">{material.title}</CardTitle>
                <CardDescription className="text-muted-foreground text-sm line-clamp-3">
                  {material.description || "No description provided."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Button asChild className="w-full gap-2" variant="outline">
                  <a href={material.fileUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" /> Open Resource Link
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Creation Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Upload Study Resource</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Title</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Microscope Balancing PDF..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Description</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Add brief details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Resource URL / Link</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="https://resource-link.pdf"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Subject</label>
              <select
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                <option value="">Select Subject</option>
                {subjects.map((sub) => (
                  <option key={sub._id} value={sub._id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Class Target</label>
              <select
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
              >
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadMaterial}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Materials;
