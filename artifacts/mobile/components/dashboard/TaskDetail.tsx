import { Task } from "@/context/TasksContext";

type Props = {
  task: Task | null;
  onClose: () => void;
};

export default function TaskDetail({
  task,
  onClose,
}: Props) {
  return null;
}