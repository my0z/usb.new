"""Kiwoom Open API+ wrapper (Windows / 32-bit Python + PyQt5 required)."""
import time

from PyQt5.QAxContainer import QAxWidget
from PyQt5.QtCore import QEventLoop

TR_SCREEN_SCREENER = "9000"
TR_SCREEN_BALANCE = "9001"
REALTIME_SCREEN = "9002"


class KiwoomAPI:
    def __init__(self):
        self.ocx = QAxWidget("KHOPENAPI.KHOpenAPICtrl.1")
        self._login_loop = QEventLoop()
        self._tr_loop = QEventLoop()
        self.tr_data = {}
        self.account_no = None
        self.on_price_tick = None   # callback(code, price, volume) set by caller
        self.on_order_result = None  # callback(order_no, code, status) set by caller

        self.ocx.OnEventConnect.connect(self._on_event_connect)
        self.ocx.OnReceiveTrData.connect(self._on_receive_tr_data)
        self.ocx.OnReceiveRealData.connect(self._on_receive_real_data)
        self.ocx.OnReceiveChejanData.connect(self._on_receive_chejan_data)

    def login(self):
        self.ocx.dynamicCall("CommConnect()")
        self._login_loop.exec_()

    def _on_event_connect(self, err_code):
        if err_code != 0:
            raise RuntimeError(f"Kiwoom login failed: err={err_code}")
        accounts = self.ocx.dynamicCall("GetLoginInfo(QString)", "ACCNO")
        self.account_no = accounts.split(";")[0]
        self._login_loop.exit()

    def get_deposit(self):
        self.ocx.dynamicCall(
            "SetInputValue(QString, QString)", "계좌번호", self.account_no
        )
        self.ocx.dynamicCall(
            "SetInputValue(QString, QString)", "비밀번호입력매체구분", "00"
        )
        self.ocx.dynamicCall(
            "CommRqData(QString, QString, int, QString)",
            "예수금조회", "opw00001", 0, TR_SCREEN_BALANCE,
        )
        self._tr_loop.exec_()
        return int(self.tr_data.get("예수금", "0").strip() or 0)

    def screen_volume_surge(self):
        """전일대비 거래량 급증 종목 조회 (opt10023)."""
        self.ocx.dynamicCall("SetInputValue(QString, QString)", "시장구분", "000")
        self.ocx.dynamicCall("SetInputValue(QString, QString)", "정렬구분", "1")
        self.ocx.dynamicCall("SetInputValue(QString, QString)", "시간구분", "1")
        self.ocx.dynamicCall("SetInputValue(QString, QString)", "거래량구분", "1")
        self.ocx.dynamicCall("SetInputValue(QString, QString)", "시간", "1")
        self.ocx.dynamicCall(
            "CommRqData(QString, QString, int, QString)",
            "거래량급증", "opt10023", 0, TR_SCREEN_SCREENER,
        )
        self._tr_loop.exec_()
        return self.tr_data.get("codes", [])

    def _on_receive_tr_data(
        self, screen_no, rqname, trcode, record_name, prev_next, *_
    ):
        if rqname == "예수금조회":
            self.tr_data["예수금"] = self.ocx.dynamicCall(
                "GetCommData(QString, QString, int, QString)",
                trcode, rqname, 0, "예수금출금가능금액",
            )
        elif rqname == "거래량급증":
            count = self.ocx.dynamicCall(
                "GetRepeatCnt(QString, QString)", trcode, rqname
            )
            codes = []
            for i in range(count):
                code = self.ocx.dynamicCall(
                    "GetCommData(QString, QString, int, QString)",
                    trcode, rqname, i, "종목코드",
                ).strip()
                if code:
                    codes.append(code)
            self.tr_data["codes"] = codes
        self._tr_loop.exit()

    def register_realtime(self, codes):
        code_list = ";".join(codes)
        self.ocx.dynamicCall(
            "SetRealReg(QString, QString, QString, QString)",
            REALTIME_SCREEN, code_list, "10;13", "0",
        )

    def unregister_realtime(self):
        self.ocx.dynamicCall("SetRealRemove(QString, QString)", REALTIME_SCREEN, "ALL")

    def _on_receive_real_data(self, code, real_type, _):
        if real_type != "주식체결":
            return
        price = abs(int(self.ocx.dynamicCall(
            "GetCommRealData(QString, int)", code, 10
        )))
        volume = abs(int(self.ocx.dynamicCall(
            "GetCommRealData(QString, int)", code, 13
        )))
        if self.on_price_tick:
            self.on_price_tick(code, price, volume)

    def send_order(self, order_name, code, quantity, price, order_type, is_buy):
        # order_type: 1=지정가 매수/매도, 3=시장가
        gubun = 1 if is_buy else 2
        ret = self.ocx.dynamicCall(
            "SendOrder(QString, QString, QString, int, QString, int, int, QString, QString)",
            order_name, REALTIME_SCREEN, self.account_no, gubun,
            code, quantity, price, order_type, "",
        )
        if ret != 0:
            raise RuntimeError(f"SendOrder failed: code={code} ret={ret}")
        time.sleep(0.3)  # Kiwoom TR/주문 초당 호출 제한 회피

    def _on_receive_chejan_data(self, gubun, item_cnt, fid_list):
        if gubun != "0":
            return
        order_no = self.ocx.dynamicCall("GetChejanData(int)", 9203).strip()
        code = self.ocx.dynamicCall("GetChejanData(int)", 9001).strip()
        status = self.ocx.dynamicCall("GetChejanData(int)", 913).strip()
        if self.on_order_result:
            self.on_order_result(order_no, code, status)
