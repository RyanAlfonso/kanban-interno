'use client'

import { FC } from 'react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from './ui/dropdown-menu';
import UserAvatar from './UserAvatar';
import { User } from 'next-auth';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

type UserAccountNavProp = {
	user: Pick<User, 'name' | 'image' | 'email'>;
};

const UserAccountNav: FC<UserAccountNavProp> = ({ user }) => {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<UserAvatar user={user} />
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end'>
				<div className='flex items-center justify-start gap-2 p-2'>
					<div className='flex flex-col space-y-1 leading-none'>
						{user.name && <p className='font-medium'>{user.name}</p>}
						{user.email && (
							<p className='w-[200px] truncate text-sm text-muted-foreground'>
								{user.email}
							</p>
						)}
					</div>
				</div>
				<DropdownMenuSeparator />

				{/* <DropdownMenuItem asChild> */}
				{/* 	<Link href='/settings'>Settings</Link> */}
				{/* </DropdownMenuItem> */}
				{/* <DropdownMenuSeparator /> */}
				<DropdownMenuItem
					className='cursor-pointer'
					onClick={(event) => {
						event.preventDefault();
						signOut({
							callbackUrl: `${window.location.origin}/`,
						})
					}}
				>
					Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default UserAccountNav;
