import { useState, useCallback } from 'react';
import { AutoComplete, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { stockService } from '../../services/stock.service';
import type { Stock } from '../../types';
import { debounce } from 'lodash-es';

interface StockSearchProps {
  onSelect: (stock: Stock) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

export function StockSearch({ 
  onSelect, 
  placeholder = 'Search stock code or name',
  style 
}: StockSearchProps) {
  const [options, setOptions] = useState<{ value: string; label: string; stock: Stock }[]>([]);
  const [loading, setLoading] = useState(false);

  const searchStocks = useCallback(
    debounce(async (searchText: string) => {
      if (!searchText || searchText.length < 2) {
        setOptions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await stockService.searchStocks({
          search: searchText,
          limit: 10,
        });

        setOptions(
          response.data.map((stock) => ({
            value: stock.stockCode,
            label: `${stock.stockCode} - ${stock.stockName}`,
            stock,
          }))
        );
      } catch (error) {
        console.error('Failed to search stocks:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  const handleSelect = (_value: string, option: any) => {
    if (option.stock) {
      onSelect(option.stock);
    }
  };

  return (
    <AutoComplete
      style={{ width: '100%', ...style }}
      options={options}
      onSearch={searchStocks}
      onSelect={handleSelect}
      notFoundContent={loading ? 'Searching...' : 'No results'}
    >
      <Input
        size="large"
        placeholder={placeholder}
        prefix={<SearchOutlined />}
        allowClear
      />
    </AutoComplete>
  );
}
