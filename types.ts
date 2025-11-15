export enum View {
  Main = 'main',
  Search = 'search',
  Settings = 'settings',
  Feedback = 'feedback',
  Privacy = 'privacy',
  About = 'about',
  Admin = 'admin',
  User = 'user',
  PublicProfile = 'publicProfile',
  Login = 'login',
  CreatePost = 'createPost',
  EditPost = 'editPost',
  EditProfile = 'editProfile',
  ManageUsers = 'manageUsers',
  Analytics = 'analytics',
  ModerateContent = 'moderateContent',
  Notifications = 'notifications',
  SiteSettings = 'siteSettings',
  PostDetail = 'postDetail',
  AdminEditUser = 'adminEditUser',
}

export interface User {
  uid: string;
  name: string;
  username: string;
  bio: string;
  email: string | null;
  profilePicUrl: string;
  role: 'user' | 'admin';
  preferredState?: string;
  preferredDistrict?: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  thumbnailUrl: string;
  authorId: string;
  authorName: string;
  authorProfilePicUrl: string;
  viewCount: number;
  shareCount: number;
  category: string;
  createdAt: Date | null; // Firestore Timestamp converted to JS Date
  locationType: 'Overall' | 'State' | 'District' | 'Block';
  state?: string;
  district?: string;
  block?: string;
}

export interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  authorProfilePicUrl: string;
  createdAt: Date;
}

export interface Notification {
  id: string;
  type: 'new_follower' | 'new_like' | 'new_comment' | 'new_post';
  fromUserId: string;
  fromUserName: string;
  fromUserProfilePicUrl: string;
  createdAt: Date;
  read: boolean;
  postId?: string;
  postTitle?: string;
}