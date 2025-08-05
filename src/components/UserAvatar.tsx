import { User } from 'next-auth';
import { Avatar, AvatarFallback } from './ui/avatar';
import { FC } from 'react';
import { AvatarProps } from '@radix-ui/react-avatar';
import Image from 'next/image';
import { User2 } from 'lucide-react';

type UserAvatarProps = {
  user: Pick<User, 'name' | 'image'>;
} & AvatarProps;

const UserAvatar: FC<UserAvatarProps> = ({ user, ...props }) => {
  return (
    <Avatar {...props}>
      {user.image ? (
        <div className='relative aspect-square h-full w-full'>
          <Image
            fill
            src={user.image}
            alt='profile picture'
            referrerPolicy='no-referrer'
          />
        </div>
      ) : (
        <AvatarFallback>
          <span className='sr-only'>{user?.name}</span>
          <User2 />
        </AvatarFallback>
      )}
    </Avatar>
  );
};

export default UserAvatar;
