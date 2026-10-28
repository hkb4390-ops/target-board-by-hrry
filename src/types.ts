export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  category: string;
  totalLectures: number;
  rating: number;
  instructor: string;
  badge: string;
  price: number;
  strikeoutPrice?: number;
  enrolled?: boolean;
  createdAt?: string;
}

export interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'pdf';
  duration: string;
  assetId?: string;
  playerUrl?: string;
  pdfUrl?: string | null;
  thumbnail?: string;
  teacher?: string;
  date?: string;
  isFree: boolean;
  order: number;
  watched?: boolean;
}

export interface Subfolder {
  id: string;
  name: string;
  level: number;
  subfolders?: Subfolder[];
  lessons?: Lesson[];
}

export interface Folder {
  id: string;
  name: string;
  level: number;
  subfolders?: Subfolder[];
  lessons?: Lesson[];
}

export interface CourseContent {
  success: boolean;
  courseId: string;
  title: string;
  source?: string;
  error?: string;
  folders: Folder[];
}
