import { useState } from "react";
import { Button } from "@/components/Button";
import { Heart } from "lucide-react";

interface Comment {
  id: string;
  author: string;
  authorInitial: string;
  authorColor: string;
  isAuthor: boolean;
  time: string;
  text: string;
  likes: number;
  liked: boolean;
}

interface CommentsProps {
  count?: number;
}

const INITIAL_COMMENTS: Comment[] = [
  {
    id: "1",
    author: "kiriko",
    authorInitial: "K",
    authorColor: "linear-gradient(135deg,#1B6EF3,#06B6D4)",
    isAuthor: true,
    time: "2 часа назад",
    text: "Спасибо всем за тёплый приём! Модель создана с использованием фото реального доспеха 16 века.",
    likes: 42,
    liked: true,
  },
  {
    id: "2",
    author: "mage_art",
    authorInitial: "M",
    authorColor: "linear-gradient(135deg,#7C3AED,#EC4899)",
    isAuthor: false,
    time: "5 часов назад",
    text: "Текстуры просто огонь! Особенно проработка металла на нагруднике. Отлично импортировался в Blender.",
    likes: 18,
    liked: false,
  },
  {
    id: "3",
    author: "robo_k",
    authorInitial: "R",
    authorColor: "linear-gradient(135deg,#10B981,#059669)",
    isAuthor: false,
    time: "вчера",
    text: "Поли-счёт оптимальный, анимации плавные. Буду использовать в своём проекте на UE5.",
    likes: 9,
    liked: false,
  },
];

export function Comments({ count = 24 }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>(INITIAL_COMMENTS);
  const [newComment, setNewComment] = useState("");

  const handleLike = (id: string) => {
    setComments(
      comments.map((c) =>
        c.id === id
          ? {
              ...c,
              liked: !c.liked,
              likes: c.liked ? c.likes - 1 : c.likes + 1,
            }
          : c,
      ),
    );
  };

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    const comment: Comment = {
      id: Date.now().toString(),
      author: "Вы",
      authorInitial: "А",
      authorColor: "linear-gradient(135deg,#1B6EF3,#7C3AED)",
      isAuthor: false,
      time: "только что",
      text: newComment,
      likes: 0,
      liked: false,
    };
    setComments([comment, ...comments]);
    setNewComment("");
  };

  return (
    <div className="pt-5">
      {/* Input */}
      <div className="flex gap-3 mb-6">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
          А
        </div>
        <div className="flex-1">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Оставь комментарий..."
            rows={2}
            className="w-full px-4 py-3 bg-surface2 border border-border rounded-xl text-text text-sm outline-none focus:border-accent transition-all duration-200 resize-none placeholder:text-textSecondary"
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="ghost"
              label="Отмена"
              onClick={() => setNewComment("")}
              className="px-4 py-2"
            />
            <Button
              variant="primary"
              label="Отправить"
              onClick={handleSubmit}
              className="px-5 py-2"
            />
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="flex flex-col gap-5">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: c.authorColor }}
            >
              {c.authorInitial}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold text-sm text-text">
                  {c.author}
                </span>
                {c.isAuthor && (
                  <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent text-[10px] font-bold">
                    Автор
                  </span>
                )}
                <span className="text-xs text-textSecondary">{c.time}</span>
              </div>
              <p className="text-sm text-textSecondary leading-relaxed">
                {c.text}
              </p>
              <div className="flex gap-4 mt-2">
                <button
                  onClick={() => handleLike(c.id)}
                  className={`text-xs flex items-center gap-1 transition-colors duration-200 ${
                    c.liked
                      ? "text-[#F43F5E]"
                      : "text-textSecondary hover:text-text"
                  }`}
                >
                  <Heart
                    className={`w-3 h-3 ${c.liked ? "fill-current" : ""}`}
                  />{" "}
                  {c.likes}
                </button>
                <button className="text-xs text-textSecondary hover:text-text transition-colors duration-200">
                  ↩ Ответить
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Comments;
