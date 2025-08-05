import { ArrowUp, ArrowUpDown, ArrowDown } from "lucide-react";
import { FC } from "react";

type TableSortedIconProps = {
  isSorted: boolean;
  isSortedDesc: boolean;
};

const TableSortedIcon: FC<TableSortedIconProps> = ({
  isSorted,
  isSortedDesc,
}) => {
  if (!isSorted) return <ArrowUpDown size={16} />;

  return isSortedDesc ? <ArrowUp size={16} /> : <ArrowDown size={16} />;
};

export default TableSortedIcon;
