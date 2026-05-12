import { useState, useEffect, useMemo } from "react";
import { format, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, Circle, Plus, Trash2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Todo, getTodos, saveTodos } from "@/lib/todos";
import { useAuth } from "@/hooks/use-auth";
import { pushTodosToCloudDebounced } from "@/lib/cloud-sync";

export default function Todos() {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date());
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high">("medium");

  const dateStr = format(date, "yyyy-MM-dd");

  useEffect(() => {
    setTodos(getTodos());
  }, []);

  const dailyTodos = useMemo(() => {
    return todos.filter(t => t.date === dateStr).sort((a, b) => {
      // Sort uncompleted first, then by priority (high > medium > low), then created_at
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const pMap = { high: 3, medium: 2, low: 1 };
      const pDiff = (pMap[b.priority || "medium"] || 2) - (pMap[a.priority || "medium"] || 2);
      if (pDiff !== 0) return pDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [todos, dateStr]);

  const pendingCount = dailyTodos.filter(t => !t.completed).length;
  const completedCount = dailyTodos.filter(t => t.completed).length;
  const totalCount = dailyTodos.length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const saveAndSync = (newTodos: Todo[]) => {
    setTodos(newTodos);
    saveTodos(newTodos);
    if (user) {
      pushTodosToCloudDebounced(user.id, newTodos);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      userId: user?.id || "",
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
      completed: false,
      date: dateStr,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveAndSync([...todos, newTodo]);
    setNewTaskTitle("");
    setNewTaskPriority("medium");
  };

  const toggleComplete = (id: string) => {
    saveAndSync(todos.map(t => t.id === id ? { ...t, completed: !t.completed, updatedAt: new Date().toISOString() } : t));
  };

  const handleDelete = (id: string) => {
    saveAndSync(todos.filter(t => t.id !== id));
  };

  const getPriorityColor = (priority?: string) => {
    if (priority === "high") return "text-destructive";
    if (priority === "medium") return "text-primary";
    return "text-muted-foreground";
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily To-Do</h1>
          <p className="text-muted-foreground">Manage your tasks and track progress</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setDate(subDays(date, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[140px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Progress Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 flex flex-col items-center justify-center space-y-2 col-span-1 border-primary/20 bg-primary/5">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted/30" />
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
                strokeDasharray={`${2 * Math.PI * 40}`} 
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressPercent / 100)}`} 
                strokeLinecap="round" 
                className="text-primary transition-all duration-1000 ease-out" />
            </svg>
            <div className="absolute text-xl font-bold">{progressPercent}%</div>
          </div>
          <div className="text-sm font-medium text-muted-foreground mt-2">Completion</div>
        </Card>
        
        <Card className="p-6 flex flex-col justify-center space-y-4 col-span-1 md:col-span-2">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-lg font-semibold">Daily Summary</h3>
              <p className="text-sm text-muted-foreground">{totalCount} total tasks</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{completedCount} <span className="text-lg text-muted-foreground font-normal">done</span></div>
              <div className="text-sm text-muted-foreground">{pendingCount} pending</div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Progress value={progressPercent} className="h-2" />
          </div>
        </Card>
      </div>

      {/* Add Task */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input 
          placeholder="Add a new task..." 
          value={newTaskTitle} 
          onChange={e => setNewTaskTitle(e.target.value)}
          className="flex-1"
        />
        <Select value={newTaskPriority} onValueChange={(v: any) => setNewTaskPriority(v)}>
          <SelectTrigger className="w-[110px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit"><Plus className="h-4 w-4 mr-2" /> Add</Button>
      </form>

      {/* Task List */}
      <div className="space-y-6">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            Pending Tasks ({pendingCount})
          </h3>
          {dailyTodos.filter(t => !t.completed).length === 0 ? (
            <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/10">
              No pending tasks. You're all caught up!
            </div>
          ) : (
            <div className="space-y-2">
              {dailyTodos.filter(t => !t.completed).map(todo => (
                <TaskItem key={todo.id} todo={todo} onToggle={() => toggleComplete(todo.id)} onDelete={() => handleDelete(todo.id)} getPriorityColor={getPriorityColor} />
              ))}
            </div>
          )}
        </div>

        {completedCount > 0 && (
          <div className="space-y-3 pt-4 border-t border-border/50">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Completed Tasks ({completedCount})
            </h3>
            <div className="space-y-2 opacity-70">
              {dailyTodos.filter(t => t.completed).map(todo => (
                <TaskItem key={todo.id} todo={todo} onToggle={() => toggleComplete(todo.id)} onDelete={() => handleDelete(todo.id)} getPriorityColor={getPriorityColor} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskItem({ todo, onToggle, onDelete, getPriorityColor }: { todo: Todo, onToggle: () => void, onDelete: () => void, getPriorityColor: (p?: string) => string }) {
  return (
    <div className={`group flex items-center gap-3 p-3 rounded-lg border bg-card transition-all ${todo.completed ? 'opacity-70' : 'hover:border-primary/50'}`}>
      <button 
        onClick={onToggle}
        className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
          todo.completed ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground hover:border-primary'
        }`}
      >
        {todo.completed && <Check className="h-3 w-3" />}
      </button>
      
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate transition-all ${todo.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {todo.title}
        </p>
        {(todo.description || todo.dueTime) && (
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {todo.dueTime && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {todo.dueTime}</span>}
            {todo.description && <span className="truncate">{todo.description}</span>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {todo.priority && (
          <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${getPriorityColor(todo.priority)}`}>
            <AlertCircle className="h-3 w-3" /> {todo.priority}
          </span>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
