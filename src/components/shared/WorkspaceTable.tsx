import { useMemo, useState, type ReactNode } from 'react';
import { Box, Stack, TextField } from '@mui/material';
import { DataGrid, type GridColDef, type GridValidRowModel } from '@mui/x-data-grid';
import { faIR } from '@mui/x-data-grid/locales';
import { useAuthText } from '../auth/text';
import { useLocale } from '../../i18n/locale';

const rowId = (row: GridValidRowModel) => row.uuid;

export function WorkspaceTable<Row extends GridValidRowModel>({ label, rows, columns, renderHeader, fallback }: {
  label: string;
  rows?: Row[];
  columns: GridColDef<Row>[];
  renderHeader: (search?: ReactNode) => ReactNode;
  fallback?: ReactNode;
}) {
  const t = useAuthText();
  const { t: ui, locale } = useLocale();
  const searchLabel = ui('search') + ' · ' + label;
  const [query, setQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10 });
  const filterModel = useMemo(() => ({ items: [], quickFilterValues: query.trim().split(/\s+/).filter(Boolean) }), [query]);
  return <Stack spacing={2}>
    {renderHeader(rows && <TextField type="search" size="small" label={searchLabel} value={query}
      onChange={event => { setQuery(event.target.value); setPagination(current => ({ ...current, page: 0 })); }}
      sx={{ width: 240, maxWidth: '100%' }} />)}
    {rows ? <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 240, maxHeight: 640 }}>
      <DataGrid<Row> aria-label={label} rows={rows} columns={columns} getRowId={rowId}
        rowHeight={64} columnHeaderHeight={48} disableRowSelectionOnClick disableColumnMenu
        paginationModel={pagination} onPaginationModelChange={setPagination} pageSizeOptions={[10, 25, 50]}
        filterModel={filterModel} ignoreDiacritics
        localeText={{
          ...(locale === 'fa' ? faIR.components.MuiDataGrid.defaultProps.localeText : {}),
          noRowsLabel: t('noRows'), noResultsOverlayLabel: t('noMatchingRows'),
          paginationRowsPerPage: t('rowsPerPage'),
          paginationDisplayedRows: ({ from, to, count }) => `${from}–${to} / ${count}`,
          paginationItemAriaLabel: type => t(type === 'next' ? 'nextPage' : 'previousPage'),
          columnHeaderSortIconLabel: t('sortColumn'),
          columnHeaderSortIconAriaLabel: name => t('sortByColumn').replace('{name}', name),
        }}
        sx={{ borderColor: 'divider', borderRadius: '12px',
          '& .MuiDataGrid-columnHeader': { bgcolor: 'action.hover' },
          '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 },
          '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
          '& .MuiDataGrid-cell[data-field="actions"]': { justifyContent: 'flex-end' },
          '& .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus-within': { outlineOffset: -2 },
        }} />
    </Box> : fallback}
  </Stack>;
}
