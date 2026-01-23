
export enum View {
  Main = 'main',
  Videos = 'videos',
  Search = 'search',
  Settings = 'settings',
  Feedback = 'feedback',
  Privacy = 'privacy',
  Terms = 'terms',
  About = 'about',
  Admin = 'admin',
  User = 'user',
  PublicProfile = 'publicProfile',
  Login = 'login',
  CreatePost = 'createPost',
  CreatePostChoice = 'createPostChoice',
  CreateVideo = 'createVideo',
  EditPost = 'editPost',
  EditProfile = 'editProfile',
  ManageUsers = 'manageUsers',
  Analytics = 'analytics',
  ModerateContent = 'moderateContent',
  Notifications = 'notifications',
  SiteSettings = 'siteSettings',
  PostDetail = 'postDetail',
  AdminEditUser = 'adminEditUser',
  ManageAccount = 'manageAccount',
  ChangePassword = 'changePassword',
  ManageAds = 'manageAds',
  ViewFeedback = 'viewFeedback',
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
  preferredBlock?: string;
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
  createdAt: Date | null;
  locationType: 'Overall' | 'State' | 'District' | 'Block';
  state?: string;
  district?: string;
  block?: string;
}

export interface VideoPost {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  videoUrl: string;
  thumbnailUrl: string;
  authorId: string;
  authorName: string;
  authorProfilePicUrl: string;
  viewCount: number;
  shareCount: number;
  category: string;
  createdAt: Date | null;
  locationType: 'Overall' | 'State' | 'District' | 'Block';
  state?: string;
  district?: string;
  block?: string;
}

export interface Draft {
  id: string;
  type: 'article' | 'video';
  title: string;
  description?: string;
  tags?: string;
  content?: string;
  videoUrl?: string;
  category: string;
  thumbnailUrl: string;
  state?: string;
  district?: string;
  block?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorProfilePicUrl: string;
  createdAt: Date;
  likeCount?: number;
  authorReply?: string;
  authorReplyCreatedAt?: Date;
}

// Added Reply interface to resolve 'Cannot find name Reply' error in components
export interface Reply {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorProfilePicUrl: string;
  createdAt: Date;
}

export interface Notification {
  id: string;
  type: 'new_follower' | 'new_like' | 'new_comment' | 'new_post' | 'new_video' | 'new_share';
  fromUserId: string;
  fromUserName: string;
  fromUserProfilePicUrl: string;
  createdAt: Date;
  read: boolean;
  postId?: string;
  videoId?: string;
  postTitle?: string;
}

export interface AdConfig {
  adsEnabled: boolean;
  adSenseClientId: string;
  adSenseSlotHome: string;
  adSenseSlotPost: string;
  adMobAppId: string;
  adMobBannerId: string;
}
