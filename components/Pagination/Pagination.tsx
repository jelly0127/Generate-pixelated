import classNames from 'classnames';
import React from 'react';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';

interface PaginationProps {
  currentColor?: string;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const Pagination = ({
  currentColor,
  currentPage,
  totalPages,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) => {
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
      } else if (currentPage >= totalPages - 2) {
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        for (let i = currentPage - 2; i <= currentPage + 2; i++) {
          pages.push(i);
        }
      }
    }

    return pages;
  };

  return (
    <div className="flex w-full flex-col items-center justify-between gap-y-4 py-4 md:flex-row">
      <div className="flex items-center text-sm">
        共 <span className="mx-1 text-blue-500">{totalCount}</span> 条记录
      </div>

      <div className="flex items-center gap-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1C1D21] text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <IoIosArrowBack />
        </button>

        {getPageNumbers().map((pageNum) => (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={classNames(
              'flex h-8 w-8 items-center justify-center rounded-md',
              currentPage === pageNum ? (currentColor ? currentColor : 'bg-blue-500 text-white') : '',
              'bg-[#1C1D21] text-white hover:bg-gray-700'
            )}
          >
            {pageNum}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1C1D21] text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <IoIosArrowForward />
        </button>

        <div className="flex items-center justify-center text-nowrap rounded-lg bg-[#1C1D21] px-2 py-1">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="w-16 rounded-md bg-transparent py-1 focus:outline-none"
          >
            <option value={10}>10 / 页</option>
            <option value={20}>20 / 页</option>
            <option value={50}>50 / 页</option>
            <option value={100}>100 / 页</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
