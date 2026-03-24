import { Header } from "@/components/Header";
import { KanbanBoard } from "@/components/KanbanBoard";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <KanbanBoard />
    </div>
  );
};

export default Index;
