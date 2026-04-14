import { useState, useEffect, useCallback } from 'react';
import qz from 'qz-tray';
import toast from 'react-hot-toast';

export const useThermalPrinter = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');

  const connect = useCallback(async () => {
    try {
      if (!qz.websocket.isActive()) {
        await qz.websocket.connect({ retries: 3, delay: 1 });
      }
      setIsConnected(true);
      const list = await qz.printers.find();
      setPrinters(list);
      // Auto-select first printer if none selected
      if (list.length > 0 && !selectedPrinter) {
        setSelectedPrinter(list[0]);
      }
    } catch (err) {
      console.error('QZ Tray connection error:', err);
      setIsConnected(false);
      // Optional: don't toast on auto-connect fail to avoid spam
    }
  }, [selectedPrinter]);

  useEffect(() => {
    connect();
    
    return () => {
      if (qz.websocket.isActive()) {
        qz.websocket.disconnect();
      }
    };
  }, [connect]);

  const printReceipt = async (printerName: string, data: any[]) => {
    if (!qz.websocket.isActive()) {
      toast.error('Chưa kết nối QZ Tray. Vui lòng mở ứng dụng QZ Tray.');
      return false;
    }
    
    try {
      const config = qz.configs.create(printerName, { encoding: 'UTF-8' });
      await qz.print(config, data);
      toast.success('Đã gửi lệnh in thành công');
      return true;
    } catch (err: any) {
      console.error('Print failed:', err);
      toast.error('Lỗi in: ' + (err.message || 'Không xác định'));
      return false;
    }
  };

  return { isConnected, printers, selectedPrinter, setSelectedPrinter, connect, printReceipt };
};
