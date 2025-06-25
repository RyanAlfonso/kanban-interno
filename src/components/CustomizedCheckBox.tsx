import { cn } from '@/lib/utils';
import { AxiosResponse } from 'axios';
import { Check } from 'lucide-react';
import { FC, MouseEvent, useState } from 'react';

type CheckBoxProps = {
	classname?: string;
	onChange?: (
		value: boolean
	) => Response | Promise<Response | AxiosResponse> | void;
	async?: boolean;
	check?: boolean;
};

const CheckBox: FC<CheckBoxProps> = ({ classname, onChange, check }) => {
	const [privateChecked, setPrivateChecked] = useState(check || false);

	const handleOnClick = async (e: MouseEvent<HTMLDivElement>) => {
		e.stopPropagation();
		setPrivateChecked((prev) => !prev);
		await onChange?.(privateChecked);
	};

	const majorCheck = typeof check === 'boolean' ? check : privateChecked;

	return (
		<div
			className={cn(
				'w-5 h-5 border border-gray-400 rounded-md mr-2',
				classname
			)}
			onClick={handleOnClick}
		>
			{majorCheck && (
				<Check className='relative w-4 h-4 left-[1px] top-[1px]' />
			)}
		</div>
	);
};

export default CheckBox;
